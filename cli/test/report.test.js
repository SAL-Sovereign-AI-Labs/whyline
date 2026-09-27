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
  assert.ok(html.includes('BOM data not available'), 'null bom shows fallback message');
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
  assert.doesNotMatch(html, /—|&mdash;/);
  assert.doesNotMatch(html, /\b(fetch|XMLHttpRequest)\s*\(/, 'read-only, no network');
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
  for (const hint of ['no AI-written lines at HEAD yet', 'no temporary items yet', 'no AI-written lines recorded yet', 'no sessions yet']) assert.ok(html.includes(hint), hint);
});

test('expiry filters cover every lifecycle state, kept included', () => {
  const html = report.render(BASE_DATA);
  for (const f of ['all', 'due', 'active', 'kept', 'removed']) assert.match(html, new RegExp(`data-f="${f}"`));
});

test('overview panels: kinds, folders and last removal come from real data, and say so when empty', () => {
  const html = report.render(BASE_DATA);
  for (const id of ['ovKindTable', 'ovFolderTable', 'ovLastRemoval']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes('nothing removed yet'), 'empty last-removal message');
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

// gather() and the project picker: every project in WHYLINE_PROJECTS or whyline.project, by basename only.
function fixtureRepo(prefix, file, prompt) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  sh(dir, ['init', '-q', '-b', 'main']);
  agentWrite(dir, file, 'def f():\n    return 1\n', 's1', prompt);
  commitAll(dir, 'first');
  return dir;
}
function embedded(html) { return JSON.parse(html.match(/window\.WHYLINE_DATA = (.*?);<\/script>/s)[1]); }
function withEnv(value, fn) {
  const before = process.env.WHYLINE_PROJECTS;
  if (value === undefined) delete process.env.WHYLINE_PROJECTS; else process.env.WHYLINE_PROJECTS = value;
  try { return fn(); } finally { if (before === undefined) delete process.env.WHYLINE_PROJECTS; else process.env.WHYLINE_PROJECTS = before; }
}

test('gather: the same data shape the report router builds', () => {
  process.env.WHYLINE_BOB_DB = '/nonexistent';
  const dir = fixtureRepo('whyline-gather-', 'cart.py', 'Add cart.');
  const d = report.gather(dir);
  assert.deepEqual(Object.keys(d).sort(), ['bom', 'check', 'generatedAt', 'head', 'notes', 'ranges', 'repo', 'sessions', 'unreviewed', 'why']);
  assert.equal(d.repo, path.basename(dir));
  assert.equal(d.head, sh(dir, ['rev-parse', 'HEAD']));
  assert.equal(d.notes, 1);
  assert.equal(d.sessions.length, 1);
  assert.equal(d.ranges.length, 1);
  assert.deepEqual(d.why.files.map(f => f.file), ['cart.py']);
  assert.ok(d.check.counts && d.unreviewed.totals, 'check and unreviewed are the lens results');
});

test('render: WHYLINE_PROJECTS adds every other repo to the picker by name, never by path', () => {
  process.env.WHYLINE_BOB_DB = '/nonexistent';
  const second = fixtureRepo('whyline-second-', 'pay.py', 'Add payments.');
  const notRepo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'whyline-notrepo-')));
  const html = withEnv([second, notRepo, second].join(':'), () => report.render(BASE_DATA));
  const data = embedded(html);
  const name = path.basename(second);
  assert.deepEqual(data.projects.map(p => p.name), ['shop-backend', name], 'current first, the second repo once, the non-repo skipped');
  assert.equal(data.projects[0].current, true);
  assert.equal(data.projects[1].current, false);
  assert.equal(data.projects[1].notes, 1);
  assert.deepEqual(Object.keys(data.others), [name]);
  assert.equal(data.others[name].notes, 1);
  assert.deepEqual(data.others[name].why.files.map(f => f.file), ['pay.py']);
  for (const p of [second, notRepo, os.tmpdir(), fs.realpathSync(os.tmpdir())]) assert.ok(!html.includes(p), 'no absolute path: ' + p);
  assert.equal(html.split('<script>').length, 3, 'exactly the data block and the template script');
});

test('projectRoots: env paths first, then git config whyline.project relative to the repo root, no duplicates or self', () => {
  process.env.WHYLINE_BOB_DB = '/nonexistent';
  const a = fixtureRepo('whyline-a-', 'a.py', 'A.');
  const b = fixtureRepo('whyline-b-', 'b.py', 'B.');
  const c = fixtureRepo('whyline-c-', 'c.py', 'C.');
  sh(a, ['config', '--add', 'whyline.project', path.join('..', path.basename(c))]);
  sh(a, ['config', '--add', 'whyline.project', path.join('..', path.basename(b))]);
  sh(a, ['config', '--add', 'whyline.project', '.']);
  sh(a, ['config', '--add', 'whyline.project', '../does-not-exist']);
  assert.deepEqual(withEnv(b, () => report.projectRoots(a)), [b, c]);
});

test('render: with no other projects, the picker lists the current one and how to add another', () => {
  const html = withEnv(undefined, () => report.render(BASE_DATA));
  const data = embedded(html);
  assert.equal(data.projects[0].name, 'shop-backend');
  assert.equal(data.projects[0].current, true);
  assert.ok(html.includes('aria-haspopup="listbox"'));
  assert.ok(html.includes('git config --add whyline.project ../path'), 'hint names how to add a repo');
});

