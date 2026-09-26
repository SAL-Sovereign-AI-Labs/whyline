'use strict';
// bom A..B on a 3-commit fixture: agent file, human file, agent mock with a human edit before commit.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const capture = require('../lib/capture');
const commit = require('../lib/commit');
const bom = require('../lib/bom');

process.env.WHYLINE_BOB_DB = '/nonexistent';

function sh(cwd, cmd, args) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'tester', GIT_COMMITTER_NAME: 'tester', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_EMAIL: 't@example.invalid' } }).trim();
}

function agentWrite(dir, file, content, sessionId, prompt) {
  const abs = path.join(dir, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  capture.handle({ hook_event_name: 'UserPromptSubmit', session_id: sessionId, cwd: dir, prompt }, { cwd: dir });
  fs.writeFileSync(abs, content);
  capture.handle({ hook_event_name: 'PostToolUse', session_id: sessionId, cwd: dir, tool_name: 'write_file', tool_input: { path: abs, content, line_count: content.split('\n').length - 1 }, tool_response: 'Created file' }, { cwd: dir });
}

function humanWrite(dir, file, content) {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), content);
}

function commitAll(dir, msg) {
  sh(dir, 'git', ['add', '.']);
  sh(dir, 'git', ['commit', '-q', '-m', msg]);
  commit.run(dir); // what the post-commit hook does
  return sh(dir, 'git', ['rev-parse', 'HEAD']);
}

// base, then c1 (agent, 4 lines), c2 (human, 3 lines), c3 (agent mock 3 lines with line 3 edited by a human, plus a human caller of 2 lines)
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-bom-'));
  sh(dir, 'git', ['init', '-q', '-b', 'main']);
  sh(dir, 'git', ['config', 'user.name', 'tester']);
  sh(dir, 'git', ['config', 'user.email', 't@example.invalid']);
  humanWrite(dir, 'README.md', '# shop\n');
  const base = commitAll(dir, 'init');

  agentWrite(dir, 'src/cart.py', 'def total(items):\n    s = 0\n    for i in items: s += i\n    return s\n', 's1', 'Add a cart total helper.');
  const c1 = commitAll(dir, 'cart total');

  humanWrite(dir, 'src/util.py', 'def clamp(x, lo, hi):\n    return max(lo, min(x, hi))\n# end\n');
  const c2 = commitAll(dir, 'util');

  agentWrite(dir, 'src/payments/mock_gateway.py', 'class MockGateway:\n    def charge(self, total):\n        return True\n', 's2', 'Add a mock payment gateway until payments-v2 lands.');
  humanWrite(dir, 'src/payments/mock_gateway.py', 'class MockGateway:\n    def charge(self, total):\n        return total > 0\n');
  humanWrite(dir, 'src/app.py', 'from payments.mock_gateway import MockGateway\ngateway = MockGateway()\n');
  const c3 = commitAll(dir, 'mock gateway');
  return { dir, base, c1, c2, c3 };
}

const fx = fixture();

test('bom over the whole fixture: lines, AI by agent, reviewed, tested, items, cost', () => {
  const r = bom.run(fx.dir, `${fx.base}..${fx.c3}`);
  assert.equal(r.range, `${fx.base}..${fx.c3}`);
  assert.equal(r.linesChanged, 12, 'added lines: 4 + 3 + 3 + 2');
  assert.deepEqual(r.ai, { total: 7, byAgent: { bob: 7 } });
  assert.deepEqual(r.reviewed, { lines: 1, percent: 14 }, 'the ai-edited line counts as reviewed');
  assert.deepEqual(r.tested, { lines: null, percent: null }, 'no coverage file: null, never zero');
  assert.deepEqual(r.items, { active: 1, due: 0, removed: 0 });
  assert.deepEqual(r.cost, { sum: null, sessionsWithCost: 0, sessions: 2 });
  assert.ok(r.missing.includes('coverage'));
  assert.ok(r.missing.includes('cost'));
});

test('the numbers add up: AI lines never exceed lines changed, byAgent sums to the total', () => {
  const r = bom.run(fx.dir, `${fx.base}..HEAD`);
  assert.ok(r.ai.total <= r.linesChanged);
  assert.equal(Object.values(r.ai.byAgent).reduce((a, b) => a + b, 0), r.ai.total);
  assert.ok(r.reviewed.lines <= r.ai.total);
});

test('a narrower range only counts notes on commits inside it', () => {
  const r = bom.run(fx.dir, `${fx.c1}..${fx.c3}`);
  assert.equal(r.linesChanged, 8);
  assert.deepEqual(r.ai, { total: 3, byAgent: { bob: 3 } });
  assert.deepEqual(r.items, { active: 1, due: 0, removed: 0 });
  assert.equal(r.cost.sessions, 1);
});

test('a range with only human commits: zero AI lines is a real zero, the review share is null', () => {
  const r = bom.run(fx.dir, `${fx.c1}..${fx.c2}`);
  assert.equal(r.linesChanged, 3);
  assert.deepEqual(r.ai, { total: 0, byAgent: {} });
  assert.deepEqual(r.reviewed, { lines: 0, percent: null });
  assert.deepEqual(r.items, { active: 0, due: 0, removed: 0 });
  assert.deepEqual(r.cost, { sum: null, sessionsWithCost: 0, sessions: 0 });
});

test('a single rev means rev..HEAD', () => {
  const r = bom.run(fx.dir, fx.c1);
  assert.equal(r.linesChanged, 8);
  assert.equal(r.ai.total, 3);
});

test('no range (repo without a tag) means the whole history, root commit included', () => {
  const r = bom.run(fx.dir, undefined);
  assert.equal(r.range, null);
  assert.equal(r.linesChanged, 13, 'README plus the 12 fixture lines');
  assert.equal(r.ai.total, 7);
  assert.equal(r.cost.sessions, 2);
  assert.match(bom.format(r), /all history/);
});

test('cost sums the sessions that have one, rounded, and names how many had it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-bom-cost-'));
  sh(dir, 'git', ['init', '-q', '-b', 'main']);
  humanWrite(dir, 'a.py', 'x = 1\ny = 2\nz = 3\n');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'a']);
  const head = sh(dir, 'git', ['rev-parse', 'HEAD']);
  require('../lib/git').notesAdd(dir, head, { v: 1, ranges: [
    { file: 'a.py', lines: [1, 1], origin: 'ai', session: 'p' },
    { file: 'a.py', lines: [2, 2], origin: 'ai', session: 'q' },
    { file: 'a.py', lines: [3, 3], origin: 'ai', session: 'r' }], items: [],
  sessions: { p: { agent: 'bob', cost: 0.1 }, q: { agent: 'bob', cost: 0.2 }, r: { agent: 'bob', cost: null } } });
  const r = bom.run(dir, undefined);
  assert.deepEqual(r.cost, { sum: 0.3, sessionsWithCost: 2, sessions: 3 });
  assert.ok(r.missing.includes('cost'), 'one session had no cost');
  assert.match(bom.format(r), /0\.3 Bobcoin \(2 of 3 sessions\)/);
});

test('a repo with no notes: unknown is null with the fix named, never a zero', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-bom-empty-'));
  sh(dir, 'git', ['init', '-q', '-b', 'main']);
  humanWrite(dir, 'a.py', 'x = 1\n');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'a']);
  const r = bom.run(dir, undefined);
  assert.equal(r.linesChanged, 1, 'lines changed is known from git alone');
  assert.deepEqual(r.ai, { total: null, byAgent: {} });
  assert.deepEqual(r.reviewed, { lines: null, percent: null });
  assert.deepEqual(r.items, { active: null, due: null, removed: null });
  assert.ok(r.missing.includes('notes'));
  const out = bom.format(r);
  assert.match(out, /AI lines\s+no data/);
  assert.match(out, /no notes yet \(commit something Bob wrote/);
  assert.doesNotMatch(out, /null/);
});

test('the .bob/ install is not part of the bill of materials', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-bom-config-'));
  sh(dir, 'git', ['init', '-q', '-b', 'main']);
  humanWrite(dir, 'app.py', 'x = 1\n');
  humanWrite(dir, '.bob/settings.json', '{\n  "hooks": {}\n}\n');
  humanWrite(dir, '.bob/skills/a/SKILL.md', 'one\ntwo\n');
  sh(dir, 'git', ['add', '.']); sh(dir, 'git', ['commit', '-q', '-m', 'app and whyline install']);
  const head = sh(dir, 'git', ['rev-parse', 'HEAD']);
  require('../lib/git').notesAdd(dir, head, { v: 1, items: [], sessions: { s: { agent: 'bob', cost: null } }, ranges: [
    { file: 'app.py', lines: [1, 1], origin: 'ai', session: 's' },
    { file: '.bob/skills/a/SKILL.md', lines: [1, 2], origin: 'ai', session: 's' }] });
  const r = bom.run(dir, undefined);
  assert.equal(r.linesChanged, 1, 'only app.py');
  assert.equal(r.ai.total, 1, 'AI lines under .bob/ are left out too, so the share stays within 100%');
});

test('an unknown rev throws with the fix named', () => {
  assert.throws(() => bom.run(fx.dir, 'nope..HEAD'), /nope.*(git log|tag|commit)/i);
});

test('text output: one table under 80 columns, count and percent in the same cell, no data instead of zero', () => {
  const out = bom.format(bom.run(fx.dir, `${fx.base}..HEAD`));
  for (const line of out.split('\n')) assert.ok(line.length <= 80, `too wide: ${line}`);
  assert.match(out, /7 \(58%\)/, 'AI lines with their share of lines changed');
  assert.match(out, /1 \(14%\)/, 'reviewed with its share of AI lines');
  assert.match(out, /tested.*no data/);
  assert.match(out, /cost.*no data \(0 of 2 sessions\)/);
});
