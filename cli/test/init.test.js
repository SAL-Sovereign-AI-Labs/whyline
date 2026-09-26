'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const init = require('../lib/init');

test('init installs .bob files and git hooks, merges without dropping user hooks, and is idempotent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-init-'));
  execFileSync('git', ['init', '-q', dir]);
  fs.mkdirSync(path.join(dir, '.bob'));
  fs.writeFileSync(path.join(dir, '.bob', 'settings.json'), JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo bye' }] }] }, other: true }));
  const silent = { log: console.log }; console.log = () => {};
  try { assert.equal(init.run(dir), 0); assert.equal(init.run(dir), 0); } finally { console.log = silent.log; }
  const s = JSON.parse(fs.readFileSync(path.join(dir, '.bob', 'settings.json'), 'utf8'));
  assert.equal(s.other, true);
  assert.equal(s.hooks.Stop[0].hooks[0].command, 'echo bye');
  assert.equal(s.hooks.PostToolUse.length, 1, 'no duplicate after second init');
  assert.match(s.hooks.PostToolUse[0].matcher, /apply_diff/);
  assert.ok(fs.existsSync(path.join(dir, '.bob', 'hooks', 'whyline.sh')));
  assert.ok(fs.existsSync(path.join(dir, '.bob', 'custom_modes.yaml')));
  assert.ok(fs.existsSync(path.join(dir, '.bob', 'skills', 'whyline-remove', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.bob', 'skills', 'whyline-check', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.bob', 'skills', 'whyline-why', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.bob', 'skills', 'whyline-decide', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(dir, '.bob', 'skills', 'whyline-setup', 'SKILL.md')));
  assert.equal(execFileSync('git', ['config', 'notes.rewriteRef'], { cwd: dir, encoding: 'utf8' }).trim(), 'refs/notes/whyline');
  assert.equal(require('node:child_process').spawnSync('git', ['config', '--get-all', 'notes.displayRef'], { cwd: dir, encoding: 'utf8' }).stdout.trim(), '', 'displayRef waits for the first note');
  const pp = fs.readFileSync(path.join(dir, '.git', 'hooks', 'pre-push'), 'utf8');
  assert.match(pp, /WHYLINE_PUSHING/, 'pre-push guards against re-entering itself when it pushes the notes ref');
  const pc = fs.readFileSync(path.join(dir, '.git', 'hooks', 'post-commit'), 'utf8');
  assert.match(pc, /whyline commit; \(whyline report/);
  assert.equal((pc.match(/whyline commit/g) || []).length, 1);
});
