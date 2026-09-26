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

test('check exits 2 with a due item, keep makes it 0, until moves it to a future date', () => {
  const dir = repoWithItem();
  let r = run(dir, ['check']);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /due\s+L-[0-9a-f]{6}\s+demo/);
  const id = r.stdout.match(/L-[0-9a-f]{6}/)[0];
  r = run(dir, ['keep', id, 'kept for the sales team']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(run(dir, ['check']).status, 0);
  r = run(dir, ['until', id, '2099-01-01']);
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(run(dir, ['check', '--json']).stdout);
  assert.equal(j.active.length, 1);
  assert.deepEqual(j.active[0].condition, { type: 'date', on: '2099-01-01' });
  assert.equal(run(dir, ['keep']).status, 1, 'usage error');
});

test('session-start prints one line only when something is due, and always exits 0', () => {
  const dir = repoWithItem();
  const r = run(dir, ['session-start']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^whyline: 1 temporary item\(s\) due/);
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

test('the shell hook entry is a no-op without whyline on PATH and never fails', () => {
  const dir = repoWithItem();
  const hook = path.join(__dirname, '..', 'lib', 'agents', 'shared', 'hook-entry.sh');
  const r = spawnSync('sh', [hook, 'capture'], { cwd: dir, input: '{}', encoding: 'utf8', env: { PATH: '/usr/bin:/bin' } });
  assert.equal(r.status, 0, r.stderr);
});
