'use strict';
// The command surface: usage, exit codes, keep/until, session-start, and the hook entry script.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const CLI = path.join(__dirname, '..', 'index.js');
const env = { ...process.env, WHYLINE_BOB_DB: '/nonexistent', GIT_AUTHOR_NAME: 't', GIT_COMMITTER_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_EMAIL: 't@example.invalid' };
function run(cwd, args, input) { return spawnSync(process.execPath, [CLI, ...args], { cwd, input, encoding: 'utf8', env }); }
function git(cwd, args) { return execFileSync('git', args, { cwd, encoding: 'utf8', env }).trim(); }

function repoWithItem() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-cli-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.name', 't']); git(dir, ['config', 'user.email', 't@example.invalid']);
  fs.writeFileSync(path.join(dir, 'README.md'), '# x\n'); git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'init']);
  const abs = path.join(dir, 'demo_seed.py');
  run(dir, ['capture'], JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'c1', cwd: dir, prompt: 'Add a demo seed script for the sales demo.' }));
  fs.writeFileSync(abs, 'def seed():\n    pass\n');
  run(dir, ['capture'], JSON.stringify({ hook_event_name: 'PostToolUse', session_id: 'c1', cwd: dir, tool_name: 'write_file', tool_input: { path: abs, content: '', line_count: 2 }, tool_response: 'ok' }));
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'seed']);
  const r = run(dir, ['commit']);
  assert.equal(r.status, 0, r.stderr);
  return dir;
}

test('no args prints usage and exits 0; unknown command exits 1', () => {
  assert.equal(run(os.tmpdir(), []).status, 0);
  assert.match(run(os.tmpdir(), []).stdout, /whyline <command>/);
  assert.equal(run(os.tmpdir(), ['nope']).status, 1);
});

test('check exits 0 by default and 2 only with --gate; keep and until accept a file name', () => {
  const dir = repoWithItem();
  let r = run(dir, ['check']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /DUE for removal \(1\)/);
  assert.match(r.stdout, /L-[0-9a-f]{6}\s+demo\s+demo_seed\.py/);
  assert.equal(run(dir, ['check', '--gate']).status, 2);
  const id = r.stdout.match(/L-[0-9a-f]{6}/)[0];
  r = run(dir, ['keep', 'demo_seed.py', 'kept for the sales team']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /demo_seed\.py \(L-/);
  assert.equal(run(dir, ['check', '--gate']).status, 0);
  r = run(dir, ['until', id, '2099-01-01']);
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(run(dir, ['check', '--json']).stdout);
  assert.equal(j.active.length, 1);
  assert.deepEqual(j.active[0].condition, { type: 'date', on: '2099-01-01' });
  assert.equal(run(dir, ['keep']).status, 1, 'usage error');
});

test('check --gate prints a GitHub annotation per due item only inside GitHub Actions', () => {
  const dir = repoWithItem();
  assert.doesNotMatch(run(dir, ['check', '--gate']).stdout, /::error/, 'no annotations outside Actions');
  const r = spawnSync(process.execPath, [CLI, 'check', '--gate'], { cwd: dir, encoding: 'utf8', env: { ...env, GITHUB_ACTIONS: 'true' } });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /^::error file=demo_seed\.py,line=1,title=whyline%3A temporary demo is due::/m);
  assert.doesNotMatch(spawnSync(process.execPath, [CLI, 'check'], { cwd: dir, encoding: 'utf8', env: { ...env, GITHUB_ACTIONS: 'true' } }).stdout, /::error/, 'plain check never annotates');
});

test('session-start prints one line only when something is due, and always exits 0', () => {
  const dir = repoWithItem();
  const r = run(dir, ['session-start']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^whyline: 1 temporary item\(s\) due for removal: demo_seed\.py \(L-/);
  assert.match(r.stdout, /say "remove demo_seed\.py"/);
  assert.equal(run(os.tmpdir(), ['session-start']).stdout, '');
});

test('why --json on a human line and on a missing file never crashes', () => {
  const dir = repoWithItem();
  assert.equal(JSON.parse(run(dir, ['why', 'README.md:1', '--json']).stdout).origin, 'human');
  const r = run(dir, ['why', 'missing.py:3', '--json']);
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).found, false);
  assert.equal(run(dir, ['why', 'bad']).status, 1);
});

test('bom and report report their missing module with exit 1 when it is absent', () => {
  const dir = repoWithItem();
  const fs2 = require('node:fs');
  const missing = ['bom', 'report'].filter(m => !fs2.existsSync(path.join(__dirname, '..', 'lib', `${m}.js`)));
  for (const m of missing) {
    const r = run(dir, [m]);
    assert.equal(r.status, 1); assert.match(r.stderr, new RegExp(`${m} is not built yet`));
  }
});

test('the shell hook entry is a no-op without whyline on PATH and never fails', () => {
  const dir = repoWithItem();
  const hook = path.join(__dirname, '..', 'lib', 'agents', 'shared', 'hook-entry.sh');
  const r = spawnSync('sh', [hook, 'capture'], { cwd: dir, input: '{}', encoding: 'utf8', env: { PATH: '/usr/bin:/bin' } });
  assert.equal(r.status, 0, r.stderr);
});

test('capture --dump keeps the raw payload for fixtures', () => {
  const dir = repoWithItem();
  const r = run(dir, ['capture', '--dump', '--agent', 'bob'], JSON.stringify({ hook_event_name: 'SessionStart', session_id: 'abc', cwd: dir, source: 'startup' }));
  assert.equal(r.status, 0);
  const raw = fs.readdirSync(path.join(dir, '.git', 'whyline', 'raw'));
  assert.equal(raw.length, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.git', 'whyline', 'raw', raw[0]), 'utf8')).source, 'startup');
});

test('review S10: read commands outside a git repository exit 3 with the fix named', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-norepo-'));
  for (const c of [['check'], ['unreviewed'], ['why', 'a.py:1'], ['bom']]) {
    const r = run(dir, c);
    assert.equal(r.status, 3, c.join(' ')); assert.match(r.stderr, /not a git repository/);
  }
});

test('review L7: until rejects an impossible date', () => {
  const dir = repoWithItem();
  const r = run(dir, ['until', 'demo_seed.py', '2026-13-45']);
  assert.equal(r.status, 1); assert.match(r.stderr, /real date/);
});
