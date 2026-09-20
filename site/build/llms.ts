import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { displayName, urlSegment } from './languages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.join(__dirname, '..', 'public');
const BASE_URL = 'https://ai-declaration.md';

export interface LlmsRow {
  version: string;
  language: string;
  is_latest: boolean;
}

export function renderLlmsTxt(rows: LlmsRow[]): string {
  const latest = rows.filter((r) => r.is_latest);
  const older = rows.filter((r) => !r.is_latest);

  const specLinks = latest.map(
    (r) =>
      `- [Specification v${r.version} (${displayName(r.language)})](${BASE_URL}/${urlSegment(r.language)}/${r.version}/): the full standard in ${displayName(r.language)}`
  );

  const archiveLinks = [...new Set(older.map((r) => r.version))]
    .sort()
    .reverse()
    .map((v) => `- [Specification v${v}](${BASE_URL}/en/${v}/): superseded, kept for projects that declare against it`);

  const sections: string[] = [
    '# AI-DECLARATION.md',
    '',
    '> An open standard for declaring how much AI was involved in building a software project. A project adds an `AI-DECLARATION.md` file to its repository stating an overall involvement level, and optionally a breakdown by process and by component.',
    '',
    'The file is plain Markdown with YAML front matter. Levels run from no AI involvement through to fully AI-generated, and a declaration is a claim by the project author, not an audit or a certification by anyone else.',
    '',
    '## Specification',
    '',
    ...specLinks,
    '',
    '## Tools',
    '',
    `- [Validate](${BASE_URL}/validate/): paste a declaration and check it against the specification`,
    `- [Directory](${BASE_URL}/directory/): public GitHub repositories that publish a declaration`,
    `- [API](${BASE_URL}/api/): read-only JSON API to detect and validate declarations, no key required`,
    `- [ai-declaration Reddit bot](https://developers.reddit.com/apps/ai-declaration/): comments on Reddit posts with what a linked repository declares`,
    '',
    '## Policies',
    '',
    `- [Terms of Use](${BASE_URL}/terms/): MIT licensed, no account, no warranty`,
    `- [Privacy Policy](${BASE_URL}/privacy/): no cookies, no analytics, no trackers`,
    '',
    '## Optional',
    '',
    `- [Source repository](https://github.com/DimwitLabs/AI-DECLARATION.md): specification, website, and API source`,
    `- [Sitemap](${BASE_URL}/sitemap.xml): every indexable page`,
  ];

  if (archiveLinks.length > 0) {
    sections.push(...archiveLinks);
  }

  return sections.join('\n') + '\n';
}

export async function generateLlmsTxt(): Promise<void> {
  const result = await pool.query<LlmsRow>(
    `SELECT version, language, is_latest
     FROM aideclaration.site_versions
     ORDER BY version DESC, language`
  );

  fs.writeFileSync(path.join(siteDir, 'llms.txt'), renderLlmsTxt(result.rows));
  console.log('  ✓ llms.txt');
}
