// Fails when a shared core file was edited in this repo instead of in the blueprint.
// The core lives in collector-app-blueprint/core and reaches every app as a "Core v<N>"
// PR (blueprint docs/10-core-sync.md); .core-manifest.json lists its files and hashes.
//   node scripts/check-core.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../.core-manifest.json', import.meta.url), 'utf8'));
const root = new URL('../', import.meta.url);

// package.json is shared except for the app's own name and version.
// Line endings don't count (Windows checkouts may use CRLF).
function normalized(path, content) {
  const text = content.replace(/\r\n/g, '\n');
  if (path !== 'package.json') return text;
  const { name: _n, version: _v, ...rest } = JSON.parse(text);
  return JSON.stringify(rest, null, 2);
}

const globToRe = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*')}$`);
const niche = manifest.nichePaths.map(globToRe);

const problems = [];
for (const [file, hash] of Object.entries(manifest.files)) {
  const url = new URL(file, root);
  if (!existsSync(url)) problems.push(`missing core file: ${file}`);
  else if (createHash('sha256').update(normalized(file, readFileSync(url, 'utf8'))).digest('hex') !== hash) problems.push(`core file edited here: ${file}`);
}
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
for (const f of tracked) {
  if (f in manifest.files || f === '.core-manifest.json' || f === 'package-lock.json' || niche.some((re) => re.test(f))) continue;
  problems.push(`file outside the niche layer and not in the core: ${f}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error('\nCore files are shared by every collector app. Change them in collector-app-blueprint/core (or edit here, then run `node tools/core-sync.mjs pull <this-app>` in the blueprint) and let the sync open the PRs.');
  process.exit(1);
}
console.log(`core ok: v${manifest.coreVersion}, ${Object.keys(manifest.files).length} files`);
