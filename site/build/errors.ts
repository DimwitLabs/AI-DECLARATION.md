import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = __dirname;
const siteDir = path.join(__dirname, '..', 'public');

export function generateErrorPages(latestVersion: string, knownLanguages: string[]): void {
  const errorDir = path.join(siteDir, 'errors');
  fs.mkdirSync(errorDir, { recursive: true });

  const template = fs.readFileSync(path.join(buildDir, 'error.html'), 'utf-8');

  fs.writeFileSync(
    path.join(errorDir, 'error.html'),
    template
      .replace(/\{\{LATEST_VERSION\}\}/g, latestVersion)
      .replace('{{KNOWN_LANGUAGES}}', JSON.stringify(knownLanguages))
  );

  console.log('  ✓ errors/error.html');
}
