import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { urlSegment } from './languages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.join(__dirname, '..', 'public');
const BASE_URL = 'https://ai-declaration.md';

function englishName(tag: string): string {
  return new Intl.DisplayNames(['en'], { type: 'language' }).of(tag) ?? tag;
}

export interface LlmsRow {
  version: string;
  language: string;
  is_latest: boolean;
}

const LEVELS = [
  ['none', 'Human acts on the task alone with no AI involvement.'],
  ['hint', 'Human acts on the task and the AI surfaces suggestions passively.'],
  ['assist', 'Human prompts and the AI acts on a part of the task.'],
  ['pair', 'Human prompts as both human and AI act on the task equally; the human understands internals clearly.'],
  ['copilot', 'Human prompts and AI acts on the whole task, prompting the human for permission or clarification.'],
  ['auto', 'Human prompts and AI acts autonomously, bringing the task to completion.'],
];

const PROCESSES = [
  ['design', 'Architecture, system design, and decision-making.'],
  ['implementation', 'Writing production code.'],
  ['testing', 'Writing tests, test plans, and quality assurance.'],
  ['documentation', 'Writing docs, comments, READMEs, and changelogs.'],
  ['review', 'Code review and pull request feedback.'],
  ['deployment', 'CI/CD configuration, infrastructure, and release scripts.'],
];

export function renderLlmsTxt(rows: LlmsRow[]): string {
  const latest = rows.filter((r) => r.is_latest);
  const older = rows.filter((r) => !r.is_latest);
  const latestVersion = latest[0]?.version ?? rows[0]?.version ?? '0.1.2';

  const specLinks = latest.map(
    (r) =>
      `- [Specification v${r.version} (${englishName(r.language)})](${BASE_URL}/${urlSegment(r.language)}/${r.version}/): the full standard in ${englishName(r.language)}`
  );

  const archiveLinks = [...new Set(older.map((r) => r.version))]
    .sort()
    .reverse()
    .map((v) => `- [Specification v${v}](${BASE_URL}/en/${v}/): superseded, kept for projects that declare against it`);

  const sections: string[] = [
    '# AI-DECLARATION.md',
    '',
    '> The most popular open standard for declaring how much AI was involved in building a software project. A project adds an `AI-DECLARATION.md` file to its repository stating an overall involvement level, and optionally a breakdown by process and by component.',
    '',
    'A declaration is a claim by the project author. Nobody verifies, audits, or certifies it, and listing in the Directory is not an endorsement. The point is transparency: a reader who knows which parts were generated can go and check exactly those parts, and an author can show their planning work alongside their code.',
    '',
    'The file is plain Markdown with YAML front matter, followed by a required `## Notes` section for human context. At minimum it needs `version`, `level`, and those notes. `processes` and `components` are optional, and the global `level` must be the highest level present among them. Any process not listed is implicitly `none`.',
    '',
    'Levels combine the verbs *act* and *prompt* with the entities *Human*, *AI*, and *task*, and cover review and design as well as code generation:',
    '',
    ...LEVELS.map(([name, description]) => `- \`${name}\`: ${description}`),
    '',
    'Processes name the phase of work a level applies to:',
    '',
    ...PROCESSES.map(([name, description]) => `- \`${name}\`: ${description}`),
    '',
    '`components` maps file paths or directories to a level, using the same six values.',
    '',
    'A minimal declaration:',
    '',
    '```markdown',
    '---',
    `version: "${latestVersion}"`,
    'level: copilot',
    'processes:',
    '  implementation: copilot',
    '  testing: assist',
    '---',
    '',
    `This format is based on [AI-DECLARATION.md](${BASE_URL}/en/${latestVersion}).`,
    '',
    '## Notes',
    '',
    '- Architecture and review were human. Implementation was AI-driven and reviewed.',
    '```',
    '',
    'The file was previously named `CANDOR.md`, and that name is still recognised by the tooling.',
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
    `- [API reference](${BASE_URL}/api/openapi.json): OpenAPI document for the endpoints above`,
    `- [ai-declaration Reddit bot](https://developers.reddit.com/apps/ai-declaration/): comments on Reddit posts with what a linked repository declares`,
    '',
    '## Resources',
    '',
    '- [yujqiao/ai-declare](https://github.com/yujqiao/ai-declare): agent skill that generates an `AI-DECLARATION.md` for a project',
    `- [DimwitLabs/ai-declare](https://github.com/DimwitLabs/ai-declare): fork of the above that reads the specification and validates through the [API](${BASE_URL}/api/)`,
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
