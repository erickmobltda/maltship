// Runs a Python 3 script on any OS: tries python3 (macOS/Linux), then py and python (Windows).
//   node scripts/python.mjs <script.py> [args…]      e.g. npm run catalog
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: node scripts/python.mjs <script.py> [args…]');
  process.exit(2);
}
for (const [cmd, ...pre] of [['python3'], ['py', '-3'], ['python']]) {
  const probe = spawnSync(cmd, [...pre, '-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)'], { stdio: 'ignore' });
  if (probe.status !== 0) continue;
  const run = spawnSync(cmd, [...pre, ...args], { stdio: 'inherit' });
  process.exit(run.status ?? 1);
}
console.error('Python 3.9+ not found. Install it from https://www.python.org/downloads/ (Windows: winget install Python.Python.3.12).');
process.exit(1);
