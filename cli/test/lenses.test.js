'use strict';
// Lifecycle states, watch, unreviewed with and without coverage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const capture = require('../lib/capture');
const commit = require('../lib/commit');
const lenses = require('../lib/lenses');
const coverage = require('../lib/coverage');

const CLI = path.join(__dirname, '..', 'index.js');
const env = { ...process.env, WHYLINE_BOB_DB: '/nonexistent', GIT_AUTHOR_NAME: 't', GIT_COMMITTER_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_EMAIL: 't@example.invalid' };
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', env }).trim();
const cli = (cwd, args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env });

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-lens-'));
  git(dir, ['init', '-q', '-b', 'main']); git(dir, ['config', 'user.name', 't']); git(dir, ['config', 'user.email', 't@example.invalid']);
  fs.writeFileSync(path.join(dir, 'README.md'), '# x\n'); git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'init']);
  return dir;
}
function agentWrite(dir, file, content, sessionId, prompt) {
  const abs = path.join(dir, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (prompt) capture.handle({ hook_event_name: 'UserPromptSubmit', session_id: sessionId, cwd: dir, prompt }, { cwd: dir });
  fs.writeFileSync(abs, content);
  capture.handle({ hook_event_name: 'PostToolUse', session_id: sessionId, cwd: dir, tool_name: 'write_file', tool_input: { path: abs, content, line_count: 1 }, tool_response: 'ok' }, { cwd: dir });
}

test('check carries lifecycle state and counts; watch changes the searched symbol', () => {
  const dir = repo();
  process.env.WHYLINE_BOB_DB = '/nonexistent';
  agentWrite(dir, 'helpers/fake_clock.py', 'class Clock:\n    pass\n', 's1', 'Add a fake clock stub until the scheduler lands.');
  fs.writeFileSync(path.join(dir, 'app.py'), 'from helpers.fake_clock import Clock\n');
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'stub']); assert.ok(commit.run(dir).attached);
  let r = lenses.check(dir);
  assert.equal(r.active[0].state, 'active'); assert.deepEqual(r.counts, { active: 1, due: 0, kept: 0, removed: 0 });
  const id = r.active[0].id;
  // wrong symbol on purpose: nothing references "Nope", so the item would look due
  lenses.recordItemChange(dir, id, { status: 'active', condition: { type: 'no_references', symbol: 'Nope' } });
  // the module name is still referenced by the import, so it stays active; drop the import and it is due
  fs.writeFileSync(path.join(dir, 'app.py'), 'print(1)\n'); git(dir, ['commit', '-qam', 'drop import']);
  assert.equal(lenses.check(dir).due[0].state, 'due');
  // watch back to the real symbol and add a real reference by symbol only
  fs.writeFileSync(path.join(dir, 'app.py'), 'x = Clock()\n'); git(dir, ['commit', '-qam', 'use clock']);
  assert.equal(cli(dir, ['watch', id, '--symbol', 'Clock']).status, 0);
  r = lenses.check(dir);
  assert.equal(r.active.length, 1); assert.match(r.active[0].evidence, /Clock/);
  assert.equal(cli(dir, ['watch', 'L-nope', '--symbol', 'X']).status, 1, 'unknown item is an error with its fix');
  const text = cli(dir, ['check']).stdout;
  assert.match(text, /lifecycle: 1 active · 0 due · 0 kept · 0 removed/);
});

test('unreviewed: unchanged AI lines count, human-edited lines do not, coverage joins when a report exists', () => {
  const dir = repo();
  agentWrite(dir, 'core/pricing.py', 'def price(x):\n    return x\n\ndef tax(x):\n    return x * 0.1\n', 's2', 'Add pricing helpers.');
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'pricing']); assert.ok(commit.run(dir).attached);
  let u = lenses.unreviewed(dir);
  assert.deepEqual(u.files.map(f => [f.file, f.aiLines, f.coverage]), [['core/pricing.py', 5, null]]);
  assert.deepEqual(u.missing, ['coverage']);
  // a human rewrites tax(): those lines leave the AI blame
  fs.writeFileSync(path.join(dir, 'core/pricing.py'), 'def price(x):\n    return x\n\ndef tax(x):\n    return round(x * 0.1, 2)\n');
  git(dir, ['commit', '-qam', 'fix rounding']);
  u = lenses.unreviewed(dir);
  assert.equal(u.files[0].aiLines, 4);
  // coverage report: lines 1,2,4 measured, 1 and 2 covered
  fs.writeFileSync(path.join(dir, 'coverage.xml'), '<coverage><packages><package><classes><class filename="core/pricing.py"><lines><line number="1" hits="1"/><line number="2" hits="3"/><line number="4" hits="0"/></lines></class></classes></package></packages></coverage>');
  u = lenses.unreviewed(dir);
  assert.equal(u.files[0].coverage, 67); assert.equal(u.totals.coverageSource, 'coverage.xml'); assert.deepEqual(u.missing, []);
  const out = cli(dir, ['unreviewed']).stdout;
  assert.match(out, /core\/pricing\.py\s+4\s+0\s+67%/);
  const j = JSON.parse(cli(dir, ['unreviewed', '--json']).stdout);
  assert.equal(j.totals.aiLines, 4);
});

test('coverage parsers: lcov and cobertura agree on a small sample', () => {
  const lcov = coverage.parseLcov('SF:src/a.js\nDA:1,1\nDA:2,0\nend_of_record\n');
  assert.deepEqual([...lcov.get('src/a.js').covered], [1]); assert.deepEqual([...lcov.get('src/a.js').measured], [1, 2]);
  const cob = coverage.parseCobertura('<class filename="src/a.js"><lines><line number="1" hits="1"/><line number="2" hits="0"/></lines></class>');
  assert.deepEqual([...cob.get('src/a.js').covered], [1]);
  assert.equal(coverage.forLines(null, 'src/a.js', [1]), null);
  assert.deepEqual(coverage.forLines({ files: lcov }, 'src/a.js', [1, 2, 3]), { covered: 1, measured: 2 });
});

test('session-start names the due item and the remover mode, and mentions unreviewed lines', () => {
  const dir = repo();
  agentWrite(dir, 'demo_seed.py', 'def seed():\n    pass\n', 's3', 'Add a demo seed script.');
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'seed']); assert.ok(commit.run(dir).attached);
  const out = cli(dir, ['session-start']).stdout;
  assert.match(out, /due for removal: L-[0-9a-f]{6}\. To act, switch to the whyline-remover mode and say "remove L-/);
  assert.match(out, /2 AI-written line\(s\) in 1 file\(s\)/);
});

test('a commit whose message says "remove L-xxxxxx" records the removed state; a message without a real change does not', () => {
  const dir = repo();
  agentWrite(dir, 'examples/old_demo.py', 'print("demo")\n', 's4', 'Add a quick demo script for the board.');
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'demo']); assert.ok(commit.run(dir).attached);
  const id = lenses.check(dir).due[0].id;
  // a commit that only mentions the id but changes nothing in the item's file must not mark it removed
  fs.writeFileSync(path.join(dir, 'NOTES.md'), 'x\n'); git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', `talk about remove ${id}`]);
  commit.run(dir);
  assert.equal(lenses.check(dir).counts.removed, 0);
  // the real removal
  git(dir, ['rm', '-q', 'examples/old_demo.py']); git(dir, ['commit', '-q', '-m', `remove ${id}: demo no longer needed`]);
  const r = commit.run(dir);
  assert.deepEqual(r.removed, [id]);
  const c = lenses.check(dir);
  assert.equal(c.counts.removed, 1); assert.equal(c.other[0].state, 'removed');
  assert.match(cli(dir, ['check']).stdout, /removed\s+L-/);
  // explicit fallback command on another item
  agentWrite(dir, 'mocks/fake.py', 'def fake():\n    pass\n', 's5', 'Add a fake stub.');
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'stub']); commit.run(dir);
  const id2 = [...lenses.index(dir).items.keys()].find(k => k !== id);
  assert.equal(cli(dir, ['removed', id2, 'deleted by hand']).status, 0);
  assert.equal(lenses.check(dir).counts.removed, 2);
});
