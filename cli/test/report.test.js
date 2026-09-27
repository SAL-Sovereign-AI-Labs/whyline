'use strict';
// render() escapes dangerous strings; output has no external http(s) script or link tags.
const test = require('node:test');
const assert = require('node:assert/strict');
const report = require('../lib/report');

const BASE_DATA = {
  generatedAt: '2026-10-21T16:40:00.000Z',
  repo: 'shop-backend',
  head: 'abc1234def5678',
  notes: 3,
  check: { due: [], active: [], other: [], counts: { active: 0, due: 0, kept: 0, removed: 0 } },
  unreviewed: { files: [], totals: { aiLines: 0, files: 0, coverageSource: null }, missing: ['coverage'] },
  bom: null,
  sessions: [],
  ranges: [],
};

test('a prompt containing </script> does not break out of the script block', () => {
  const data = {
    ...BASE_DATA,
    sessions: [{ id: 's1', agent: 'bob', author: 'dev', ts: '2026-10-01T00:00:00Z', prompt: 'do </script><script>alert(1)</script> this', cost: null, commit: 'abc' }],
  };
  const html = report.render(data);
  // The raw </script> sequence must not appear inside the injected JSON block
  // (it is encoded as \u003c/script>)
  assert.ok(!html.includes('</script><script>alert'), 'raw </script> injection must be escaped');
  // The \u003c escape must be present
  assert.ok(html.includes('\\u003c'), 'less-than in strings must be escaped as \\u003c');
});

test('output contains no http(s) script src or stylesheet link tags', () => {
  const html = report.render(BASE_DATA);
  assert.doesNotMatch(html, /<script[^>]+src\s*=\s*["']?https?:\/\//i, 'no external script src');
  assert.doesNotMatch(html, /<link[^>]+href\s*=\s*["']?https?:\/\//i, 'no external stylesheet link');
});

test('null bom renders "no data" section gracefully, not throwing', () => {
  const html = report.render({ ...BASE_DATA, bom: null });
  assert.ok(html.includes('AI report: no data'), 'null bom shows fallback message');
});

test('prompt text is HTML-escaped in the sessions table', () => {
  const data = {
    ...BASE_DATA,
    sessions: [{ id: 's2', agent: 'bob', author: 'dev', ts: '2026-10-01T00:00:00Z', prompt: '<b>bold</b> & "quoted"', cost: null, commit: 'abc' }],
  };
  const html = report.render(data);
  // The '<' characters in the JSON blob are encoded as \u003c so that
  // </script> sequences cannot escape the script block.
  // JSON.stringify encodes '<' but leaves '>' as-is.
  assert.ok(html.includes('\\u003cb>'), 'less-than in prompts is \\u003c-escaped in JSON');
});

test('a prompt containing $& or $\' is injected verbatim, not read as a replacement pattern', () => {
  const prompt = "price in $'s and $& and $` here";
  const html = report.render({ ...BASE_DATA, sessions: [{ id: 's3', agent: 'bob', author: 'dev', ts: null, prompt, cost: null, commit: 'abc' }] });
  assert.ok(html.includes(JSON.stringify(prompt)), 'prompt survives render unchanged');
  assert.equal(html.split('<script>').length, 3, 'exactly the data block and the template script');
});

test('the report is one offline file with no em dashes', () => {
  const html = report.render(BASE_DATA);
  assert.doesNotMatch(html, /\u2014|&mdash;/);
  assert.doesNotMatch(html, /\b(fetch|XMLHttpRequest)\s*\(/, 'read-only, no network');
});

test('the header explains the page in one sentence and links to the project, still fully offline', () => {
  const html = report.render(BASE_DATA);
  assert.ok(html.includes("This report shows, for every line an AI (IBM Bob, IBM's AI coding assistant) wrote in this repository, the request behind it, and which temporary code is ready to delete."), 'header sentence');
  assert.match(html, /<a href="https:\/\/github\.com\/SAL-Sovereign-AI-Labs\/whyline">/, 'project link');
  assert.doesNotMatch(html, /<script[^>]+src\s*=/i, 'no external script');
  assert.doesNotMatch(html, /<link[^>]+rel\s*=\s*["']?stylesheet/i, 'no external stylesheet');
  assert.doesNotMatch(html, /@import/i, 'no imported stylesheet');
});

test('people read plain words: tab names, status labels and conditions', () => {
  const html = report.render(BASE_DATA);
  for (const tab of ['Why is this here?', 'Temporary code', 'AI code nobody changed', 'AI report']) assert.ok(html.includes(`>${tab}`), tab);
  for (const label of ["'waiting'", "'ready to delete'", "'kept on purpose'", "'deleted'", "'nothing uses '", "'after '"]) assert.ok(html.includes(label), label);
  assert.ok(html.includes("plural(unrevFiles, 'file', 'files')"), 'the unreviewed badge says it counts files');
  assert.doesNotMatch(html, /remove &lt;id&gt;/, 'removal is asked for by file name, not id');
});

test('generatedAt and repo appear in the output', () => {
  const html = report.render(BASE_DATA);
  assert.ok(html.includes('shop-backend'), 'repo name present');
  assert.ok(html.includes('2026-10-21'), 'generatedAt date present');
});

// collect(): the Why view's data at HEAD, on a real capture and commit fixture.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const capture = require('../lib/capture');
const commit = require('../lib/commit');
const lenses = require('../lib/lenses');

function sh(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'tester', GIT_COMMITTER_NAME: 'tester', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_EMAIL: 't@example.invalid' } }).trim();
}
function agentWrite(dir, file, content, sessionId, prompt) {
  const abs = path.join(dir, file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  capture.handle({ hook_event_name: 'UserPromptSubmit', session_id: sessionId, cwd: dir, prompt }, { cwd: dir });
  fs.writeFileSync(abs, content);
  capture.handle({ hook_event_name: 'PostToolUse', session_id: sessionId, cwd: dir, tool_name: 'write_file', tool_input: { path: abs, content, line_count: content.split('\n').length - 1 }, tool_response: 'Created file' }, { cwd: dir });
}
function commitAll(dir, msg) { sh(dir, ['add', '-A', '.']); sh(dir, ['commit', '-q', '-m', msg]); commit.run(dir); }

test('collect: every AI line at HEAD with its session, moved lines follow blame, deleted files are gone', () => {
  process.env.WHYLINE_BOB_DB = '/nonexistent';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-report-'));
  sh(dir, ['init', '-q', '-b', 'main']);
  agentWrite(dir, 'cart.py', 'def count(o):\n    return len(o.items)\n\ndef empty(o):\n    return not o.items\n', 's1', 'Add cart helpers.');
  agentWrite(dir, 'mock_api.py', 'class MockApi:\n    pass\n', 's1', 'Add cart helpers.');
  commitAll(dir, 'helpers');
  // a human adds a header above the AI code, rewrites one AI line, and deletes the mock
  fs.writeFileSync(path.join(dir, 'cart.py'), '# cart\nimport sys\ndef count(o):\n    return len(o.items)\n\ndef empty(o):\n    return len(o.items) == 0\n');
  fs.rmSync(path.join(dir, 'mock_api.py'));
  commitAll(dir, 'human edits');

  const w = report.collect(dir, lenses.index(dir));
  assert.deepEqual(w.files.map(f => f.file), ['cart.py'], 'the deleted mock is not listed');
  const cart = w.files[0];
  assert.equal(cart.lines, 7);
  const origin = n => cart.code.find(l => l.n === n).origin;
  assert.equal(origin(1), null, 'human header');
  assert.equal(origin(2), null);
  assert.equal(origin(3), 'ai', 'AI line moved from 1 to 3 keeps its origin');
  assert.equal(cart.code.find(l => l.n === 3).session, 's1');
  assert.equal(origin(7), null, 'the line a human rewrote is human now');
  assert.equal(cart.aiLines, 4);
  // same answer as `whyline why` on every line
  for (const l of cart.code) assert.equal(l.origin, lenses.why(dir, 'cart.py', l.n).origin === 'human' ? null : lenses.why(dir, 'cart.py', l.n).origin, `line ${l.n}`);
});

test('collect: a repo with no notes gives an empty list, not an error', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-report-empty-'));
  sh(dir, ['init', '-q', '-b', 'main']);
  sh(dir, ['commit', '-q', '--allow-empty', '-m', 'init']);
  assert.deepEqual(report.collect(dir), { files: [], skipped: 0 });
});

test('empty repo: every view says what to do next instead of an empty table', () => {
  const html = report.render({ ...BASE_DATA, notes: 0, why: { files: [], skipped: 0 } });
  for (const hint of ['no AI-written lines in the current code yet', 'no temporary code yet', 'no AI-written lines recorded yet', 'no Bob chats saved yet']) assert.ok(html.includes(hint), hint);
});

test('expiry filters cover every lifecycle state, kept included', () => {
  const html = report.render(BASE_DATA);
  for (const f of ['all', 'due', 'active', 'kept', 'removed']) assert.match(html, new RegExp(`data-f="${f}"`));
});

test('overview panels: kinds, folders and last removal come from real data, and say so when empty', () => {
  const html = report.render(BASE_DATA);
  for (const id of ['ovKindTable', 'ovFolderTable', 'ovLastRemoval']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes('nothing deleted yet'), 'empty last-removal message');
});

test('keyboard and screen reader hooks are in place', () => {
  const html = report.render(BASE_DATA);
  assert.match(html, /aria-live="polite"/, 'line detail is announced');
  assert.match(html, /aria-controls="side"/, 'menu button names what it opens');
  assert.match(html, /:focus-visible\{[^}]*outline:2px/, 'visible focus outline');
  assert.match(html, /\.why-file-row:focus\{[^}]*outline:2px/, 'file rows replace the default outline with their own');
});

test('overview KPI: zero items shows "0" not "no data" when notes exist (counts.active=0, counts.due=0)', () => {
  // Before the fix, `counts.active + counts.due || null` evaluated to `0 || null = null`,
  // causing nd(null) = 'no data' for repos with notes but no temporary items.
  const html = report.render({
    ...BASE_DATA,
    check: { due: [], active: [], other: [], counts: { active: 0, due: 0, kept: 0, removed: 0 } },
    sessions: [],
  });
  // The template JS must not have the old broken expression
  assert.doesNotMatch(html, /counts\.active \+ counts\.due \|\| null/, 'old broken expression must not be present');
  // The template JS must have the fixed null-guard
  assert.match(html, /counts\.active != null/, 'fixed null-guard must be present');
  // nd(sessions.length) must not silently turn 0 into "no data"
  assert.doesNotMatch(html, /sessions\.length \|\| null/, 'sessions length must not use || null');
});

