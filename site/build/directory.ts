import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AdopterRow {
  repo_full_name: string;
  repo_url: string;
  source_file: string;
  is_featured: boolean;
  stars: number;
  spec_version: string | null;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function generateDirectory(siteDir: string): Promise<void> {
  const result = await pool.query<AdopterRow>(
    `SELECT repo_full_name, repo_url, source_file, is_featured, COALESCE(stars, 0) AS stars, spec_version
     FROM aideclaration.adopters
     ORDER BY is_featured DESC, stars DESC, spec_version DESC NULLS LAST, repo_full_name ASC`
  );

  const rows = result.rows;
  const template = fs.readFileSync(path.join(__dirname, 'directory.html'), 'utf-8');

  const items = rows.map((row) => {
    const tags: string[] = [];
    if (row.is_featured) tags.push('featured');
    if (row.source_file === 'CUSTOM') tags.push('adapted');

    const tagHtml = tags.map((t) => `<span class="dtag dtag-${t}">${t}</span>`).join('');
    const starsHtml = row.stars > 0 ? `<span class="dir-stars">★ ${row.stars.toLocaleString()}</span>` : '';
    const versionHtml = row.spec_version ? `<span class="dir-version">v${esc(row.spec_version)}</span>` : '';

    return `      <li class="dir-item" data-tags="${tags.join(' ')}"><a href="${esc(row.repo_url)}" class="dir-repo">${esc(row.repo_full_name)}</a>${tagHtml}${starsHtml}${versionHtml}</li>`;
  }).join('\n');

  const html = template
    .replace('{{COUNT}}', String(rows.length))
    .replace('{{ITEMS}}', items || '      <li class="dir-empty">No entries yet.</li>');

  const outDir = path.join(siteDir, 'directory');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`  ✓ directory/index.html (${rows.length} entries)`);
}
