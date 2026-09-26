'use strict';
// The demo builder must produce the same repo every time: known items, known states, mock becomes due on merge.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const BUILD = path.join(__dirname, '..', '..', 'demo', 'build.js');
const CLI = path.join(__dirname, '..', 'index.js');

test('demo builds deterministically; merge of payments-v2 makes the mock due', () => {
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-demo-')), 'shop');
  const env = { ...process.env, WHYLINE_BOB_DB: '/nonexistent' };
  const b1 = spawnSync(process.execPath, [BUILD, target], { encoding: 'utf8', env });
  assert.equal(b1.status, 0, b1.stderr);
  const check = () => JSON.parse(spawnSync(process.execPath, [CLI, 'check', '--json'], { cwd: target, encoding: 'utf8', env }).stdout);
  let c = check();
  const kinds = [...c.due, ...c.active].map(i => `${i.kind}:${i.file}:${i.state}`).sort();
  assert.deepEqual(kinds, [
    'demo:examples/demo_orders.py:due',
    'fixture:tests/fixtures/big_orders.json:active',
    'flag:config/flags.yaml:active',
    'mock:src/payments/mock_gateway.py:active',
    'shim:src/db/compat_sqlite.py:active',
    'shim:src/reports/legacy_export.py:active',
  ]);
  assert.equal(c.active.find(i => i.kind === 'shim' && i.file.includes('legacy')).condition.type, 'date');
  // control file never flagged
  assert.ok(![...c.due, ...c.active].some(i => i.file.includes('rates.py')));
  // second build gives the same ids
  const ids1 = [...c.due, ...c.active].map(i => i.id).sort();
  const b2 = spawnSync(process.execPath, [BUILD, target], { encoding: 'utf8', env });
  assert.equal(b2.status, 0, b2.stderr);
  const ids2 = [...check().due, ...check().active].map(i => i.id).sort();
  assert.deepEqual(ids1, ids2);
  execFileSync('git', ['merge', '-q', '--no-edit', 'payments-v2'], { cwd: target, env: { ...env, GIT_AUTHOR_NAME: 'demo', GIT_COMMITTER_NAME: 'demo', GIT_AUTHOR_EMAIL: 'd@example.invalid', GIT_COMMITTER_EMAIL: 'd@example.invalid' } });
  c = check();
  assert.equal(c.due.find(i => i.kind === 'mock').state, 'due');
});
