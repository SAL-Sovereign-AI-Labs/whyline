'use strict';
// Adapter registry contract. Every adapter must pass this suite; add a fixture per agent under test/fixtures/<id>-payloads.json.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const agents = require('../lib/agents');

const REQUIRED = ['id', 'name', 'configDir', 'matches', 'parseEvent', 'isWholeFileTool', 'sessionCost', 'install', 'installedIn'];

test('every registered adapter implements the contract', () => {
  assert.ok(agents.all().length >= 1);
  for (const a of agents.all()) {
    for (const k of REQUIRED) assert.ok(k in a, `${a.id} missing ${k}`);
    assert.equal(agents.byId(a.id), a);
    assert.equal(a.matches({}), false, `${a.id} must not match an empty payload`);
    assert.equal(a.parseEvent({}), null);
    assert.equal(a.sessionCost('not-a-session'), null);
  }
  assert.equal(agents.byId('nope'), null);
  assert.equal(agents.detect({}), null);
});

test('bob adapter: detection and normalization of the real payload fixture', () => {
  const bob = agents.byId('bob');
  const payloads = require('./fixtures/bob-payloads.json');
  for (const p of payloads) assert.equal(agents.detect(p), bob, JSON.stringify(p).slice(0, 80));
  const prompt = bob.parseEvent(payloads.find(p => p.hook_event_name === 'UserPromptSubmit'));
  assert.equal(prompt.type, 'prompt'); assert.match(prompt.prompt, /hello\.py/);
  const wf = bob.parseEvent(payloads.find(p => p.tool_name === 'write_file'));
  assert.deepEqual([wf.type, wf.tool, wf.file, wf.patch], ['write', 'write_file', '/tmp/exp-bob/hello.py', '']);
  assert.equal(bob.isWholeFileTool('write_file'), true);
  const ad = bob.parseEvent(payloads.find(p => p.tool_name === 'apply_diff'));
  assert.equal(ad.type, 'write'); assert.match(ad.patch, /^@@ -1,4 \+1,8 @@/m);
  assert.equal(bob.isWholeFileTool('apply_diff'), false);
  // docs spelling of the same payload
  const old = bob.parseEvent({ event: 'PostToolUse', session_id: 'x', tool: 'write_file', input: { path: '/r/a.py', content: '' }, output: 'ok' });
  assert.deepEqual([old.type, old.file], ['write', '/r/a.py']);
  assert.equal(bob.parseEvent({ hook_event_name: 'PostToolUse', session_id: 'x', tool_name: 'read_file', tool_input: { path: '/r/a.py' } }), null);
});

test('bob adapter: real Bob IDE 2.2 payloads (cart task, 26 Sep 2026) normalize like the Shell ones', () => {
  const bob = agents.byId('bob');
  const payloads = require('./fixtures/bob-ide-payloads.json').filter(p => !p._note);
  assert.equal(payloads.length, 4);
  for (const p of payloads) assert.equal(agents.detect(p), bob);
  const kinds = payloads.map(p => bob.parseEvent(p)).map(e => e && `${e.type}:${e.tool || ''}`);
  assert.deepEqual(kinds, ['prompt:', 'write:write_file', 'write:write_file', 'write:apply_diff']);
  const ad = bob.parseEvent(payloads[3]);
  assert.match(ad.patch, /^@@ /m, 'the IDE returns the same <patch> block as the Shell');
  assert.equal(bob.isWholeFileTool('apply_diff'), false);
});

test('bob adapter: install writes .bob and is idempotent; installedIn reflects it', () => {
  const bob = agents.byId('bob');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-agent-'));
  execFileSync('git', ['init', '-q', dir]);
  assert.equal(bob.installedIn(dir), false);
  const first = bob.install(dir);
  assert.ok(first.includes(path.join('.bob', 'settings.json')));
  assert.ok(first.includes(path.join('.bob', 'hooks', 'whyline.sh')));
  assert.ok(first.some(f => f.endsWith(path.join('skills', 'whyline-remove', 'SKILL.md'))));
  // simulate an older install whose command lacked --agent: it must be replaced, not duplicated
  const f = path.join(dir, '.bob', 'settings.json');
  const old = JSON.parse(fs.readFileSync(f, 'utf8'));
  old.hooks.PostToolUse[0].hooks[0].command = 'sh .bob/hooks/whyline.sh capture';
  old.hooks.Stop = [{ hooks: [{ type: 'command', command: 'echo user-hook' }] }];
  fs.writeFileSync(f, JSON.stringify(old));
  bob.install(dir);
  const s = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.equal(s.hooks.PostToolUse.length, 1);
  assert.equal(s.hooks.Stop[0].hooks[0].command, 'echo user-hook', 'unrelated hooks untouched');
  assert.match(s.hooks.PostToolUse[0].hooks[0].command, /--agent bob/);
  assert.equal(bob.installedIn(dir), true);
  assert.ok(fs.statSync(path.join(dir, '.bob', 'hooks', 'whyline.sh')).mode & 0o111, 'hook entry is executable');
});
