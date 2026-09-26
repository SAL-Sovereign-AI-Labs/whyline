'use strict';
// End to end on a temporary git repo: capture -> commit -> why / check, driven the way the hooks drive it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const capture = require('../lib/capture');
const commit = require('../lib/commit');
const lenses = require('../lib/lenses');
const session = require('../lib/session');

function sh(cwd, cmd, args, input) {
  return execFileSync(cmd, args, { cwd, input, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'tester', GIT_COMMITTER_NAME: 'tester', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_EMAIL: 't@example.invalid' } }).trim();
}

function tempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-'));
  sh(dir, 'git', ['init', '-q', '-b', 'main']);
  sh(dir, 'git', ['config', 'user.name', 'tester']);
  sh(dir, 'git', ['config', 'user.email', 't@example.invalid']);
  fs.writeFileSync(path.join(dir, 'README.md'), '# demo\n');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'init']);
  return dir;
}

// Simulate an agent write_file followed by the hook payload.
function agentWrite(dir, file, content, sessionId, prompt) {
  const abs = path.join(dir, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (prompt) capture.handle({ hook_event_name: 'UserPromptSubmit', session_id: sessionId, cwd: dir, prompt }, { cwd: dir });
  fs.writeFileSync(abs, content);
  capture.handle({ hook_event_name: 'PostToolUse', session_id: sessionId, cwd: dir, tool_name: 'write_file', tool_input: { path: abs, content, line_count: content.split('\n').length - 1 }, tool_response: 'Created file' }, { cwd: dir });
}

test('agent write, commit, why: origin ai with prompt, temporary item created', () => {
  const dir = tempRepo();
  process.env.WHYLINE_BOB_DB = '/nonexistent';
  const content = 'class MockGateway:\n    def charge(self, total):\n        return True\n';
  agentWrite(dir, 'src/payments/mock_gateway.py', content, 'abc123', 'Add a mock payment gateway so the checkout demo works until payments-v2 lands.');
  assert.equal(session.readAll(dir).length, 2);
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'add mock']);
  const r = commit.run(dir);
  assert.ok(r.attached, r.reason);
  assert.deepEqual(r.note.ranges, [{ file: 'src/payments/mock_gateway.py', lines: [1, 3], origin: 'ai', session: 'abc123' }]);
  assert.equal(r.note.items.length, 1);
  assert.equal(r.note.items[0].kind, 'mock');
  assert.deepEqual(r.note.items[0].condition, { type: 'no_references', symbol: 'MockGateway' });
  assert.equal(session.readAll(dir).filter(l => l.t === 'write').length, 0, 'consumed');

  const w = lenses.why(dir, 'src/payments/mock_gateway.py', 2);
  assert.equal(w.origin, 'ai');
  assert.match(w.prompt, /mock payment gateway/);
  assert.equal(w.item.kind, 'mock');
  const human = lenses.why(dir, 'README.md', 1);
  assert.equal(human.origin, 'human');
});

test('human edit before commit becomes ai-edited, untouched part stays ai', () => {
  const dir = tempRepo();
  const content = 'def a():\n    return 1\n\ndef b():\n    return 2\n';
  agentWrite(dir, 'lib.py', content, 's1', 'Add helpers a and b.');
  // human rewrites b before committing
  fs.writeFileSync(path.join(dir, 'lib.py'), 'def a():\n    return 1\n\ndef b():\n    return 42  # fixed\n');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'helpers']);
  const r = commit.run(dir);
  assert.ok(r.attached, r.reason);
  const ai = r.note.ranges.filter(x => x.origin === 'ai').map(x => x.lines);
  const edited = r.note.ranges.filter(x => x.origin === 'ai-edited').map(x => x.lines);
  assert.deepEqual(ai, [[1, 4]]);
  assert.deepEqual(edited, [[5, 5]]);
  assert.equal(r.note.items.length, 0, 'helpers are not temporary');
});

test('check: no_references item becomes due when the referencing file is removed', () => {
  const dir = tempRepo();
  agentWrite(dir, 'mocks/fake_api.py', 'def fake_api():\n    return {}\n', 's2', 'Add a fake API stub until the real service is ready.');
  fs.writeFileSync(path.join(dir, 'app.py'), 'from mocks.fake_api import fake_api\nprint(fake_api())\n');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'stub']);
  assert.ok(commit.run(dir).attached);
  let c = lenses.check(dir);
  assert.equal(c.due.length, 0); assert.equal(c.active.length, 1);
  sh(dir, 'git', ['rm', '-q', 'app.py']); sh(dir, 'git', ['commit', '-q', '-m', 'drop app']);
  c = lenses.check(dir);
  assert.equal(c.due.length, 1);
  assert.equal(c.due[0].kind, 'mock');
});

test('an edited call site of a mock is not itself flagged as temporary', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'checkout.py'), 'def checkout(o):\n    return o.total()\n');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'checkout']);
  const prompt = 'Add a mock gateway in mock_gateway.py until payments-v2 lands, then call it from checkout.py.';
  agentWrite(dir, 'mock_gateway.py', 'class MockGateway:\n    pass\n', 's3', prompt);
  // simulate an apply_diff on the existing file: hook records the added line only
  fs.writeFileSync(path.join(dir, 'checkout.py'), 'from mock_gateway import MockGateway\ndef checkout(o):\n    return o.total()\n');
  capture.handle({ hook_event_name: 'PostToolUse', session_id: 's3', cwd: dir, tool_name: 'apply_diff', tool_input: { path: path.join(dir, 'checkout.py'), diff: '' },
    tool_response: 'Edited file\n<patch>\n@@ -1,2 +1,3 @@\n+from mock_gateway import MockGateway\n def checkout(o):\n     return o.total()\n</patch>' }, { cwd: dir });
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'mock']);
  const r = commit.run(dir);
  assert.ok(r.attached, r.reason);
  assert.deepEqual(r.note.items.map(i => i.file), ['mock_gateway.py']);
  assert.ok(r.note.ranges.some(x => x.file === 'checkout.py' && x.lines[0] === 1 && x.lines[1] === 1));
  assert.equal(session.readAll(dir).length, 0, 'prompt pruned once its writes are consumed');
});

test('payloads outside the repo, malformed, or non-write tools are ignored', () => {
  const dir = tempRepo();
  assert.equal(capture.handle({ hook_event_name: 'PostToolUse', session_id: 'x', tool_name: 'read_file', tool_input: { path: '/etc/hosts' } }, { cwd: dir }), 'ignored');
  assert.equal(capture.handle({ event: 'PostToolUse', session_id: 'x', tool: 'write_file', input: { path: '/etc/hosts' } }, { cwd: dir }), 'outside');
  assert.equal(capture.handle({}, { cwd: dir }), 'ignored');
  assert.equal(session.readAll(dir).length, 0);
});

test('real Bob payload fixture records the apply_diff ranges', () => {
  const dir = tempRepo();
  const payloads = require('./fixtures/bob-payloads.json');
  fs.writeFileSync(path.join(dir, 'hello.py'), '# SKILL_MARKER_OK\n\ndef add(a, b):\n    return a + b\n\n\ndef sub(a, b):\n    return a - b\n');
  const p = payloads.find(x => x.tool_name === 'apply_diff' && x.hook_event_name === 'PostToolUse');
  const payload = { ...p, cwd: dir, tool_input: { ...p.tool_input, path: path.join(dir, 'hello.py') } };
  assert.equal(capture.handle(payload, { cwd: dir }), 'write');
  const line = session.readAll(dir)[0];
  assert.equal(line.tool, 'apply_diff');
  assert.equal(line.approx, false);
  assert.ok(line.ranges.length >= 1);
});
