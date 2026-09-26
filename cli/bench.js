#!/usr/bin/env node
'use strict';
// npm run bench: median wall time of the hook and read commands on a freshly built demo repo. Prints what README quotes.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI = path.join(__dirname, 'index.js');
const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-bench-')), 'shop');
const env = { ...process.env, WHYLINE_BOB_DB: '/nonexistent' };
spawnSync(process.execPath, [path.join(__dirname, '..', 'demo', 'build.js'), target], { encoding: 'utf8', env });

const payload = JSON.stringify({ hook_event_name: 'PostToolUse', session_id: 'bench000bench000bench000bench000', cwd: target, tool_name: 'write_file',
  tool_input: { path: path.join(target, 'README.md'), content: '', line_count: 1 }, tool_response: 'ok' });
const runs = {
  'capture hook (sh entry + node)': () => spawnSync('sh', ['.bob/hooks/whyline.sh', 'capture', '--agent', 'bob'], { cwd: target, input: payload, env: { ...env, PATH: `${path.join(__dirname, '..', 'node_modules', '.bin')}:${process.env.PATH}` } }),
  'check': () => spawnSync(process.execPath, [CLI, 'check'], { cwd: target, env }),
  'why': () => spawnSync(process.execPath, [CLI, 'why', 'src/payments/mock_gateway.py:2'], { cwd: target, env }),
  'session-start': () => spawnSync(process.execPath, [CLI, 'session-start'], { cwd: target, env }),
  'unreviewed': () => spawnSync(process.execPath, [CLI, 'unreviewed'], { cwd: target, env }),
  'bom': () => spawnSync(process.execPath, [CLI, 'bom'], { cwd: target, env }),
  'report': () => spawnSync(process.execPath, [CLI, 'report', '--out', path.join(target, 'r.html')], { cwd: target, env }),
};
const N = Number(process.argv[2]) || 10;
console.log(`whyline bench: median of ${N} runs, ${os.cpus()[0].model}, node ${process.version}, demo repo with 7 notes`);
for (const [name, fn] of Object.entries(runs)) {
  const t = [];
  for (let i = 0; i < N; i++) { const s = process.hrtime.bigint(); fn(); t.push(Number(process.hrtime.bigint() - s) / 1e6); }
  t.sort((a, b) => a - b);
  console.log(`${name.padEnd(32)} ${Math.round(t[Math.floor(N / 2)]).toString().padStart(5)} ms   (min ${Math.round(t[0])}, max ${Math.round(t[N - 1])})`);
}
