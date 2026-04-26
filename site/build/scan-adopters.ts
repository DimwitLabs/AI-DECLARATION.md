import * as path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, '..', '..', '.env') });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');

function hasOurFormat(content: string): boolean {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return false;
  return /^\s*version\s*:/m.test(m[1]) && /^\s*level\s*:/m.test(m[1]);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ghSearch(page: number, filename: string) {
  const res = await fetch(
    `https://api.github.com/search/code?q=filename:${encodeURIComponent(filename)}&per_page=30&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );
  if (res.status === 403 || res.status === 429) {
    const retry = Number(res.headers.get('retry-after') ?? 60);
    console.log(`  Rate limited — waiting ${retry}s`);
    await sleep(retry * 1000);
    return ghSearch(page, filename);
  }
  if (!res.ok) throw new Error(`Search API ${res.status}`);
  return res.json() as Promise<{ total_count: number; items: any[] }>;
}

async function fetchContent(fullName: string, filePath: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${fullName}/HEAD/${filePath}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } });
  if (!res.ok) return null;
  return res.text();
}

async function fetchStars(fullName: string): Promise<number> {
  const res = await fetch(`https://api.github.com/repos/${fullName}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.stargazers_count ?? 0;
}

const SCAN_TARGETS = ['AI-DECLARATION.md', 'CANDOR.md'];

async function setup() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aideclaration.adopters (
      repo_full_name TEXT        NOT NULL,
      source_file    TEXT        NOT NULL,
      repo_url       TEXT        NOT NULL,
      is_featured    BOOLEAN     DEFAULT false,
      stars          INTEGER     DEFAULT 0,
      first_seen_at  TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (repo_full_name, source_file)
    )
  `);
  await pool.query(`ALTER TABLE aideclaration.adopters ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE aideclaration.adopters ADD COLUMN IF NOT EXISTS spec_version TEXT`);
}

async function scanFile(filename: string): Promise<{ scanned: number; found: number }> {
  let page = 1;
  let total = 0;
  let scanned = 0;
  let found = 0;

  do {
    const data = await ghSearch(page, filename);
    if (page === 1) {
      total = Math.min(data.total_count, 1000);
      console.log(`\n[${filename}] ${data.total_count} files found (scanning up to ${total})`);
    }

    for (const item of data.items) {
      scanned++;
      process.stdout.write(`  [${scanned}/${total}] ${item.repository.full_name} ... `);

      const basename = item.path.split('/').pop();
      if (basename !== filename) {
        console.log('skip (wrong filename)');
        continue;
      }

      await sleep(1000);
      const content = await fetchContent(item.repository.full_name, item.path);

      if (!content || !hasOurFormat(content)) {
        console.log('skip');
        continue;
      }

      found++;
      const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const specVersion = fm ? (fm[1].match(/^\s*version\s*:\s*["']?([0-9]+\.[0-9]+\.[0-9]+)["']?/m)?.[1] ?? null) : null;

      await sleep(500);
      const stars = await fetchStars(item.repository.full_name);
      await pool.query(
        `INSERT INTO aideclaration.adopters (repo_full_name, source_file, repo_url, stars, is_featured, spec_version, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (repo_full_name, source_file) DO UPDATE SET
           repo_url     = EXCLUDED.repo_url,
           stars        = EXCLUDED.stars,
           is_featured  = EXCLUDED.is_featured,
           spec_version = EXCLUDED.spec_version,
           last_seen_at = NOW()`,
        [item.repository.full_name, filename, item.repository.html_url, stars, stars >= 50, specVersion]
      );
      console.log(`added (★ ${stars})`);
    }

    if (data.items.length < 30 || scanned >= total) break;
    page++;
    await sleep(2000);
  } while (true);

  return { scanned, found };
}

async function scan() {
  await setup();

  let totalScanned = 0;
  let totalFound = 0;

  for (const filename of SCAN_TARGETS) {
    const { scanned, found } = await scanFile(filename);
    totalScanned += scanned;
    totalFound += found;
  }

  console.log(`\nDone — ${totalFound} adopters found out of ${totalScanned} scanned.`);
}

scan()
  .catch((err) => { console.error('Scan failed:', err instanceof Error ? err.message : 'unknown error'); process.exit(1); })
  .finally(() => pool.end());
