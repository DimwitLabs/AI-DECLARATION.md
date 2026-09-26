import type pg from 'pg';

export const FEATURED_MIN_STARS = 150;
export const NEW_FOR_DAYS = 3;

const SPEC_LINK = /https?:\/\/(?:www\.)?ai-declaration\.md\b/i;

const DERIVATIVES: { id: string; link: RegExp }[] = [
  { id: 'lemmy-selfhosted', link: /lemmy\.world\/post\/49151085\b/ },
];

const FRONT_MATTER_WITHIN_LINES = 10;

export function findFrontMatter(content: string): string | null {
  const lines = content.split(/\r?\n/);
  const start = lines.slice(0, FRONT_MATTER_WITHIN_LINES).findIndex((l) => l.trim() === '---');
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i > start && l.trim() === '---');
  if (end === -1) return null;
  const block = lines.slice(start + 1, end).join('\n');
  return /^\s*version\s*:/m.test(block) && /^\s*level\s*:/m.test(block) ? block : null;
}

export function findSpecVersion(content: string): string | null {
  const block = findFrontMatter(content);
  return block?.match(/^\s*version\s*:\s*["']?([^"'\s#]+)["']?/m)?.[1] ?? null;
}

export function findLineage(content: string): string | null {
  if (findFrontMatter(content) || SPEC_LINK.test(content)) return 'direct';
  return DERIVATIVES.find((d) => d.link.test(content))?.id ?? null;
}

export async function ensureAdoptersSchema(pool: pg.Pool): Promise<void> {
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
  await pool.query(
    `ALTER TABLE aideclaration.adopters ADD COLUMN IF NOT EXISTS conformance TEXT CHECK (conformance IN ('conforming', 'adapted'))`
  );
  await pool.query(`ALTER TABLE aideclaration.adopters ADD COLUMN IF NOT EXISTS lineage TEXT`);

  await pool.query(
    `UPDATE aideclaration.adopters
     SET conformance = 'adapted', lineage = COALESCE(lineage, 'direct')
     WHERE source_file = 'CUSTOM' AND conformance IS NULL`
  );
}
