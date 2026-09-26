import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { FEATURED_MIN_STARS, NEW_FOR_DAYS, ensureAdoptersSchema, findDerivative } from './adopters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AdopterRow {
  repo_full_name: string;
  repo_url: string;
  source_file: string;
  is_featured: boolean;
  stars: number;
  spec_version: string | null;
  conformance: string | null;
  lineage: string | null;
  file_path: string | null;
  level: string | null;
  error_count: number;
  warning_count: number;
  is_new: boolean;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const UNKNOWN_VERSION_NOTE = 'Uses custom or invalid version tag';

function segments(parts: string[]): string {
  return parts.map((p) => `<span class="dir-seg">${p}</span>`).join(' · ');
}

function countPill(kind: 'error' | 'warning', n: number): string {
  return n > 0 ? `<span class="dtag dtag-${kind}">${n} ${kind}${n === 1 ? '' : 's'}</span>` : '';
}

function detailPanel(row: AdopterRow): string {
  const facts = segments([esc(row.file_path ?? row.source_file), ...(row.stars > 0 ? [`★ ${row.stars.toLocaleString()}`] : [])]);
  const derivative = findDerivative(row.lineage);
  if (derivative) {
    return `<div class="dir-detail" hidden><p class="dir-detail-meta">${facts}</p><p class="dir-detail-note">Follows the <a href="${derivative.url}">${derivative.name}</a> format, derived from this specification.</p></div>`;
  }
  const level = row.level ? `<span class="ltag ltag-${esc(row.level)}">${esc(row.level)}</span>` : '';
  const pills = countPill('error', row.error_count) + countPill('warning', row.warning_count);
  const flags = pills
    ? `<div class="dir-detail-flags">${pills}<span class="dir-detail-note">Own this repo? Check it in <a href="/validate/">Validate</a>.</span></div>`
    : '';
  return `<div class="dir-detail" hidden><p class="dir-detail-meta">${level}${facts}</p>${flags}</div>`;
}

export async function generateDirectory(siteDir: string): Promise<void> {
  await ensureAdoptersSchema(pool);

  const result = await pool.query<AdopterRow>(
    `SELECT repo_full_name, repo_url, source_file,
            (is_featured AND conformance IS DISTINCT FROM 'invalid') AS is_featured,
            COALESCE(stars, 0) AS stars, spec_version, conformance, lineage, file_path, level,
            COALESCE(error_count, 0) AS error_count, COALESCE(warning_count, 0) AS warning_count,
            first_seen_at > NOW() - make_interval(days => $1) AS is_new
     FROM aideclaration.adopters
     ORDER BY is_featured DESC, stars DESC, spec_version DESC NULLS LAST, repo_full_name ASC`,
    [NEW_FOR_DAYS]
  );

  const rows = result.rows;

  const knownVersions = new Set(
    (await pool.query<{ version: string }>(
      `SELECT DISTINCT version FROM aideclaration.site_versions`
    )).rows.map((r) => r.version)
  );
  const template = fs.readFileSync(path.join(__dirname, 'directory.html'), 'utf-8');

  const items = rows.map((row) => {
    const tags: string[] = [];
    if (row.is_featured) tags.push('featured');
    if (row.is_new) tags.push('new');
    if (row.conformance === 'adapted') tags.push('adapted');
    if (row.conformance === 'invalid') tags.push('invalid');

    const tagHtml = tags.map((t) => `<span class="dtag dtag-${t}">${t}</span>`).join('');
    const dotHtml = tags.map((t) => `<i class="dir-dot dtag-${t}"></i>`).join('');
    const version = row.spec_version ?? findDerivative(row.lineage)?.version ?? null;
    const versionHtml = version
      ? knownVersions.has(version)
        ? `<span class="dir-version">v${esc(version)}</span>`
        : `<span class="dir-version dir-version-unknown" tabindex="0" data-tooltip="${UNKNOWN_VERSION_NOTE}" aria-label="v${esc(version)} — ${UNKNOWN_VERSION_NOTE}">v${esc(version)}</span>`
      : '';

    const [owner, repo] = row.repo_full_name.split('/', 2);
    const name = `<span class="dir-name"><a href="${esc(row.repo_url)}" class="dir-repo">${esc(owner)}/<span class="dir-repo-name">${esc(repo)}</span></a>${dotHtml ? `<span class="dir-dots" aria-hidden="true">${dotHtml}</span>` : ''}</span>`;
    const toggle = `<button class="dir-toggle" aria-expanded="false" aria-label="Details for ${esc(row.repo_full_name)}">+</button>`;

    return `      <li class="dir-item" id="${esc(row.repo_full_name)}" data-tags="${tags.join(' ')}">${name}<span class="dir-meta">${tagHtml}${versionHtml}</span>${toggle}${detailPanel(row)}</li>`;
  }).join('\n');

  const now = new Date();
  const lastUpdated = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(23, 59, 0, 0);
  const nextUpdate = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at 11:59 PM UTC';

  const html = template
    .replace('{{COUNT}}', String(rows.length))
    .replace('{{ITEMS}}', items || '      <li class="dir-empty">No entries yet.</li>')
    .replace('{{LAST_UPDATED}}', lastUpdated)
    .replace('{{NEXT_UPDATE}}', nextUpdate)
    .replace('{{FEATURED_MIN_STARS}}', String(FEATURED_MIN_STARS))
    .replace('{{NEW_FOR_DAYS}}', String(NEW_FOR_DAYS));

  const outDir = path.join(siteDir, 'directory');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`  ✓ directory/index.html (${rows.length} entries)`);
}
