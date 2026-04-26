import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

const version = process.argv[2]?.replace(/^v/, '');

if (!version) {
  console.error('Usage: npm run archive -- v0.1.3');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid version format: "${version}". Expected x.y.z`);
  process.exit(1);
}

interface ReadmeEntry {
  language: string;
  filePath: string;
}

function detectReadmeFiles(): ReadmeEntry[] {
  const files = fs.readdirSync(rootDir);
  const entries: ReadmeEntry[] = [];

  for (const file of files) {
    if (file === 'README.md') {
      entries.push({ language: 'en', filePath: path.join(rootDir, file) });
    } else {
      const match = file.match(/^README_([a-z]{2,5})\.md$/i);
      if (match) {
        entries.push({
          language: match[1].toLowerCase(),
          filePath: path.join(rootDir, file),
        });
      }
    }
  }

  return entries;
}

async function archive() {
  const entries = detectReadmeFiles();

  if (!entries.length) {
    console.error('No README files found.');
    process.exit(1);
  }

  const langs = entries.map((e) => e.language).join(', ');
  console.log(`Archiving v${version} — found ${entries.length} language(s): ${langs}`);

  const gitTag = `v${version}`;
  const gitCommit = process.env.GITHUB_SHA?.slice(0, 7) ?? '';
  const releaseDate = new Date().toISOString().split('T')[0];

  await pool.query(
    `UPDATE aideclaration.site_versions SET is_latest = false`
  );

  for (const { language, filePath } of entries) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const metadata = {
      title: 'AI-DECLARATION.md | Open Standard for AI Usage Transparency',
      description: 'An open standard for declaring AI usage in software projects.',
      release_date: releaseDate,
      git_tag: gitTag,
      git_commit: gitCommit,
    };

    await pool.query(
      `INSERT INTO aideclaration.site_versions (version, language, content_markdown, metadata, is_latest, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, $5, $5)
       ON CONFLICT (version, language)
       DO UPDATE SET
         content_markdown = EXCLUDED.content_markdown,
         metadata = EXCLUDED.metadata,
         is_latest = true,
         updated_at = NOW()`,
      [version, language, content, JSON.stringify(metadata), releaseDate]
    );

    console.log(`  ✓ ${language}`);
  }

  console.log(`\nArchived v${version} and marked as latest.`);
}

archive()
  .catch((err) => {
    console.error('Archive failed:', err instanceof Error ? err.message : 'unknown error');
    process.exit(1);
  })
  .finally(() => pool.end());
