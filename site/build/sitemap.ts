import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.join(__dirname, '..', 'public');
const BASE_URL = 'https://ai-declaration.md';

interface SitemapRow {
  version: string;
  language: string;
  is_latest: boolean;
  created_at: Date;
}

export async function generateSitemap(): Promise<void> {
  const result = await pool.query<SitemapRow>(
    `SELECT version, language, is_latest, created_at
     FROM aideclaration.site_versions
     ORDER BY version DESC, language`
  );

  const urls: string[] = [];

  for (const row of result.rows) {
    const priority = row.is_latest ? '1.0' : '0.8';
    const lastmod = new Date(row.created_at).toISOString().split('T')[0];
    urls.push(`  <url>
    <loc>${BASE_URL}/${row.language}/${row.version}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`);
  }

  urls.push(`  <url>
    <loc>${BASE_URL}/errors/translation.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>`);

  urls.push(`  <url>
    <loc>${BASE_URL}/errors/version.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), xml);
  console.log('  ✓ sitemap.xml');
}
