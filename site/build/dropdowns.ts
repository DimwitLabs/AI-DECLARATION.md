import { pool } from './db.js';

export interface VersionRow {
  version: string;
  is_latest: boolean;
}

export async function getVersions(): Promise<VersionRow[]> {
  const result = await pool.query(
    `SELECT DISTINCT version, is_latest
     FROM aideclaration.site_versions
     ORDER BY version DESC`
  );
  return result.rows;
}

export function generateVersionDropdown(
  versions: VersionRow[],
  currentVersion: string,
  currentLanguage: string
): string {
  const items = versions
    .map((v) => {
      const active = v.version === currentVersion ? ' active' : '';
      const badge = v.is_latest ? ' <span class="badge">latest</span>' : '';
      return `        <a href="/${currentLanguage}/${v.version}/" class="dropdown-item${active}">v${v.version}${badge}</a>`;
    })
    .join('\n');

  return `    <div class="dropdown">
      <button class="dropdown-toggle">v${currentVersion} <span class="arrow">▾</span></button>
      <div class="dropdown-menu">
${items}
      </div>
    </div>`;
}

export function generateLanguageDropdown(
  languages: string[],
  currentLanguage: string,
  currentVersion: string
): string {
  const sorted = [...languages].sort((a, b) =>
    a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)
  );

  const items = sorted
    .map((lang) => {
      const active = lang === currentLanguage ? ' active' : '';
      return `        <a href="/${lang}/${currentVersion}/" class="dropdown-item${active}">${lang.toUpperCase()}</a>`;
    })
    .join('\n');

  return `    <div class="dropdown">
      <button class="dropdown-toggle">${currentLanguage.toUpperCase()} <span class="arrow">▾</span></button>
      <div class="dropdown-menu">
${items}
      </div>
    </div>`;
}
