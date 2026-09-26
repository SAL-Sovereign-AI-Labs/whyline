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
  const pc = fs.readFileSync(path.join(dir, '.git', 'hooks', 'post-commit'), 'utf8');
  assert.match(pc, /whyline commit/);
  assert.equal((pc.match(/whyline commit/g) || []).length, 1);
});
