import * as path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import { pool } from './db.js';
import { FEATURED_MIN_STARS, ensureAdoptersSchema, findLineage, findSpecVersion } from './adopters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, '..', '..', '.env') });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');

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
    console.log(`  Rate limited: waiting ${retry}s`);
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

async function conforms(content: string): Promise<boolean> {
  const res = await fetch('https://ai-declaration.md/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: content,
  });
  if (!res.ok) throw new Error(`Validate API ${res.status}`);
  const data = (await res.json()) as { valid: boolean };
  return data.valid;
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
      if (basename?.toLowerCase() !== filename.toLowerCase()) {
        console.log('skip (wrong filename)');
        continue;
      }

      await sleep(1000);
      const content = await fetchContent(item.repository.full_name, item.path);

      if (!content) {
        console.log('skip (unreadable)');
        continue;
      }

      const lineage = findLineage(content);
      if (!lineage) {
        console.log('skip (no link to the spec)');
        continue;
      }

      found++;
      const specVersion = findSpecVersion(content);
      const conformance = (await conforms(content)) ? 'conforming' : 'adapted';

      await sleep(500);
      const stars = await fetchStars(item.repository.full_name);
      await pool.query(
        `INSERT INTO aideclaration.adopters (repo_full_name, source_file, repo_url, stars, is_featured, spec_version, conformance, lineage, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (repo_full_name, source_file) DO UPDATE SET
           repo_url     = EXCLUDED.repo_url,
           stars        = EXCLUDED.stars,
           is_featured  = EXCLUDED.is_featured,
           spec_version = EXCLUDED.spec_version,
           conformance  = EXCLUDED.conformance,
           lineage      = EXCLUDED.lineage,
           last_seen_at = NOW()`,
        [item.repository.full_name, filename, item.repository.html_url, stars, stars >= FEATURED_MIN_STARS, specVersion, conformance, lineage]
      );
      console.log(`added (${conformance}, ${lineage}, ★ ${stars})`);
    }

    if (data.items.length < 30 || scanned >= total) break;
    page++;
    await sleep(2000);
  } while (true);

  return { scanned, found };
}

async function scan() {
  await ensureAdoptersSchema(pool);

  let totalScanned = 0;
  let totalFound = 0;

  for (const filename of SCAN_TARGETS) {
    const { scanned, found } = await scanFile(filename);
    totalScanned += scanned;
    totalFound += found;
  }

  console.log(`\nDone: ${totalFound} adopters found out of ${totalScanned} scanned.`);
}

scan()
  .catch((err) => { console.error('Scan failed:', err instanceof Error ? err.message : 'unknown error'); process.exit(1); })
  .finally(() => pool.end());
