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
  assert.equal(session.readAll(dir).filter(l => l.t === 'write').length, 0, 'writes consumed');
  assert.equal(session.readAll(dir).filter(l => l.t === 'prompt').length, 1, 'the prompt stays: a session can span several commits');
});

test('a payload whose path differs only in letter case still lands inside the repo (macOS, Windows)', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'WhylineCase-'));
  sh(dir, 'git', ['init', '-q', '-b', 'main']);
  const lower = dir.toLowerCase();
  if (!fs.existsSync(lower) || lower === dir) { t.skip('case-sensitive file system'); return; }
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  const git = require('../lib/git');
  assert.equal(git.relPath(lower, path.join(lower, 'a.py')), 'a.py');
  assert.equal(capture.handle({ hook_event_name: 'PostToolUse', session_id: 's9', cwd: lower, tool_name: 'write_file', tool_input: { path: path.join(lower, 'a.py'), content: '', line_count: 1 }, tool_response: 'ok' }, { cwd: lower }), 'write');
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

test('review finding 1: human imports added above AI code before the commit stay human', () => {
  const dir = tempRepo();
  agentWrite(dir, 'lib.py', 'def a():\n    return 1\n\ndef b():\n    return 2\n', 's10', 'Add helpers.');
  fs.writeFileSync(path.join(dir, 'lib.py'), 'import os\nimport sys\ndef a():\n    return 1\n\ndef b():\n    return 2\n');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'helpers with imports']);
  const r = commit.run(dir);
  assert.ok(r.attached, r.reason);
  assert.deepEqual(r.note.ranges.map(x => [x.origin, x.lines]), [['ai', [3, 7]]]);
  assert.equal(lenses.why(dir, 'lib.py', 1).origin, 'human');
  assert.equal(lenses.why(dir, 'lib.py', 3).origin, 'ai');
});

test('review finding 2: a file with a non-ASCII name gets a note and its session lines drain', () => {
  const dir = tempRepo();
  agentWrite(dir, 'src/café.py', 'x = 1\n', 's11', 'Add café.');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'café']);
  const r = commit.run(dir);
  assert.ok(r.attached, r.reason);
  assert.equal(r.note.ranges[0].file, 'src/café.py');
  assert.equal(session.readAll(dir).filter(l => l.t === 'write').length, 0);
});

test('review finding 3: the prompt survives into the second commit of the same session', () => {
  const dir = tempRepo();
  agentWrite(dir, 'a.py', 'a = 1\n', 's12', 'Add a and a mock b, temporary until the real b lands.');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'a']); assert.ok(commit.run(dir).attached);
  agentWrite(dir, 'mock_b.py', 'class MockB:\n    pass\n', 's12');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'b']);
  const r = commit.run(dir);
  assert.ok(r.attached, r.reason);
  assert.match(r.note.sessions.s12.prompt, /temporary until the real b lands/);
  assert.match(r.note.items[0].reason, /until the real b lands/);
});

test('review finding 4: a whole-file rewrite of an existing file records only the changed lines', () => {
  const dir = tempRepo();
  const big = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'big.py'), big); sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'big']);
  const changed = big.replace('line 25', 'line 25 changed by bob');
  agentWrite(dir, 'big.py', changed, 's13', 'Fix line 25.');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'fix']);
  const r = commit.run(dir);
  assert.ok(r.attached, r.reason);
  assert.deepEqual(r.note.ranges.map(x => x.lines), [[25, 25]]);
  assert.equal(lenses.why(dir, 'big.py', 1).origin, 'human');
  assert.equal(lenses.why(dir, 'big.py', 25).origin, 'ai');
});

test('review S1: git commit --amend keeps the earlier file ranges in the note', () => {
  const dir = tempRepo();
  sh(dir, 'git', ['config', 'notes.rewriteRef', 'refs/notes/whyline']);
  agentWrite(dir, 'a.py', 'a = 1\n', 's14', 'Add a.');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'a']); assert.ok(commit.run(dir).attached);
  agentWrite(dir, 'b.py', 'b = 2\n', 's14');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '--amend', '--no-edit']);
  const r = commit.run(dir);
  assert.ok(r.attached, r.reason);
  assert.deepEqual(r.note.ranges.map(x => x.file).sort(), ['a.py', 'b.py']);
  assert.equal(lenses.why(dir, 'a.py', 1).origin, 'ai');
});

test('review S2: a deleted item file is recorded removed whatever the message; an edit-only commit naming the file is not', () => {
  const dir = tempRepo();
  agentWrite(dir, 'mocks/fake_pay.py', 'class FakePay:\n    pass\n', 's15', 'Add a fake payment stub until the gateway is ready.');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'stub']); assert.ok(commit.run(dir).attached);
  fs.appendFileSync(path.join(dir, 'mocks/fake_pay.py'), '# note\n');
  sh(dir, 'git', ['commit', '-q', '-am', 'remove stale print from fake_pay.py']);
  assert.deepEqual(commit.run(dir).removed, [], 'edit only: not removed');
  sh(dir, 'git', ['rm', '-q', 'mocks/fake_pay.py']); sh(dir, 'git', ['commit', '-q', '-m', 'chore: drop the fake payment stub']);
  assert.equal(commit.run(dir).removed.length, 1, 'file deleted: removed even without the word remove');
  assert.equal(lenses.check(dir).counts.removed, 1);
});

test('review S13: a second session rewriting a tracked file does not create a second item', () => {
  const dir = tempRepo();
  agentWrite(dir, 'mock_gw.py', 'class M:\n    pass\n', 's16', 'Add a mock gateway.');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'm1']); assert.ok(commit.run(dir).attached);
  agentWrite(dir, 'mock_gw.py', 'class M:\n    def charge(self):\n        return True\n', 's17', 'Extend the mock gateway.');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'm2']); assert.ok(commit.run(dir).attached);
  assert.equal(lenses.index(dir).items.size, 1);
  assert.equal(lenses.resolveItem(dir, 'mock_gw.py').file, 'mock_gw.py');
});
