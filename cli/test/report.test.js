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
