import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { parseMarkdown } from './parser.js';
import { getVersions, generateVersionDropdown, generateLanguageDropdown } from './dropdowns.js';
import { generateErrorPages } from './errors.js';
import { generateSitemap } from './sitemap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = __dirname;
const siteDir = path.join(__dirname, '..', 'public');
const BASE_URL = 'https://ai-declaration.md';

const template = fs.readFileSync(path.join(buildDir, 'template.html'), 'utf-8');

interface PageRow {
  version: string;
  language: string;
  content_markdown: string;
  metadata: Record<string, string>;
  is_latest: boolean;
}

async function generateSite(): Promise<void> {
  const result = await pool.query<PageRow>(
    `SELECT version, language, content_markdown, metadata, is_latest
     FROM aideclaration.site_versions
     ORDER BY version, language`
  );

  const rows = result.rows;
  const versions = await getVersions();
  const latestVersion = versions.find((v) => v.is_latest)?.version ?? versions[0].version;

  const versionLanguages = new Map<string, string[]>();
  for (const row of rows) {
    const langs = versionLanguages.get(row.version) ?? [];
    langs.push(row.language);
    versionLanguages.set(row.version, langs);
  }

  for (const row of rows) {
    const outDir = path.join(siteDir, row.language, row.version);
    fs.mkdirSync(outDir, { recursive: true });

    const content = parseMarkdown(row.content_markdown);
    const langs = versionLanguages.get(row.version) ?? [row.language];

    const versionsDropdown = generateVersionDropdown(versions, row.version, row.language);
    const languagesDropdown = generateLanguageDropdown(langs, row.language, row.version);

    const oldVersionBanner = row.is_latest
      ? ''
      : `<div class="old-version-banner">\n  <span class="stale-version">v${row.version}</span> is outdated; the latest specification is at <a href="/${row.language}/${latestVersion}/">v${latestVersion}</a>\n</div>`;

    const title = row.metadata.title ?? 'AI-DECLARATION.md | Open Standard for AI Usage Transparency';
    const description = row.metadata.description ?? 'An open standard for declaring AI usage in software projects.';
    const ogUrl = `${BASE_URL}/${row.language}/${row.version}`;

    const html = template
      .replace('{{LANGUAGE}}', row.language)
      .replace('{{VERSION}}', row.version)
      .replace('{{IS_LATEST}}', String(row.is_latest))
      .replace('{{TITLE}}', title)
      .replace(/\{\{DESCRIPTION\}\}/g, description)
      .replace('{{OG_URL}}', ogUrl)
      .replace('{{LANGUAGES_DROPDOWN}}', languagesDropdown)
      .replace('{{VERSIONS_DROPDOWN}}', versionsDropdown)
      .replace('{{OLD_VERSION_BANNER}}', oldVersionBanner)
      .replace('{{CONTENT}}', content);

    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    console.log(`  ✓ ${row.language}/${row.version}/index.html`);
  }

  const knownLanguages = [...new Set(rows.map((r) => r.language))];
  generateErrorPages(latestVersion, knownLanguages);
  await generateSitemap();
}

async function main() {
  console.log('Generating site...');
  try {
    await generateSite();
    console.log('\nDone.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Generate failed:', err);
  process.exit(1);
});
