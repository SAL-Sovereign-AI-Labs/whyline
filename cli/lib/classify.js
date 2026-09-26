'use strict';
// Rules that mark an agent write as temporary code. Deterministic, no model call.
const RULES = [
  { kind: 'mock', words: ['mock', 'stub', 'fake'], paths: [/(^|\/)mock_/, /(^|\/)fake_/, /(^|\/)mocks\//, /stub/] },
  { kind: 'demo', words: ['demo', 'example', 'sample', 'quick script'], paths: [/(^|\/)examples?\//, /(^|\/)demos?\//, /(^|\/)demo_/, /(^|\/)sample_/] },
  { kind: 'flag', words: [], paths: [/flags?\.(ya?ml|json)$/, /feature_flags/] }, // flags live in config files; the reader code is permanent
  { kind: 'shim', words: ['workaround', 'temporary', 'temporarily', 'until', 'shim', 'compat', 'hack', 'todo remove'], paths: [/(^|\/)compat_/, /_shim/, /(^|\/)legacy_/] },
  { kind: 'fixture', words: ['fixture', 'seed data', 'test data'], paths: [/(^|\/)fixtures\//, /(^|\/)seed/] },
];

function hasWord(text, w) {
  return new RegExp(`(^|[^a-z])${w.replace(/ /g, '\\s+')}([^a-z]|$)`, 'i').test(text);
}

// Returns {kind, reason} or null.
// Pass 1: path rules, any file (a fixtures folder or a flags file is temporary whatever the prompt said).
// Pass 2: prompt words, only for files the agent created and only outside tests/ (an edit to an existing file that
// merely calls a mock is not itself temporary, and a test that mentions "until" is not the temporary thing).
// Documentation and agent assets (markdown, .bob/, skills, docs) are never temporary code, whatever the prompt said.
const DOC_ASSET = /\.(md|mdx|txt|rst)$|(^|\/)\.bob\/|(^|\/)docs?\/|(^|\/)skills\//;

function temporary(prompt, file, { created = true } = {}) {
  const p = String(prompt || '');
  const inTests = /(^|\/)tests?\//.test(file);
  for (const r of RULES) if (r.paths.some(re => re.test(file))) return { kind: r.kind, reason: reasonFrom(p) };
  if (!created || inTests || DOC_ASSET.test(file)) return null;
  for (const r of RULES) if (r.words.some(w => hasWord(p, w))) return { kind: r.kind, reason: reasonFrom(p) };
  return null;
}

// "... until payments-v2 lands ..." -> "until payments-v2 lands"; else the first sentence.
function reasonFrom(prompt) {
  const m = prompt.match(/\b(until|before|for now|temporar\w+)\b[^.,;\n]*/i);
  if (m) return m[0].trim().slice(0, 140);
  return prompt.split(/[.\n]/)[0].trim().slice(0, 140);
}

// Condition from the prompt: an explicit date wins, else no_references on the first symbol in the range.
function condition(prompt, content) {
  const d = String(prompt || '').match(/\b(?:until|before|by)\s+(\d{4}-\d{2}-\d{2})\b/i);
  if (d) return { type: 'date', on: d[1] };
  const sym = content.match(/^\s*(?:export\s+)?(?:async\s+)?(?:def|class|function|const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)/m);
  return { type: 'no_references', symbol: sym ? sym[1] : null }; // null symbol: the file stem alone is searched
}

function itemId(file, ranges, sessionId) {
  const { createHash } = require('node:crypto');
  return 'L-' + createHash('sha1').update(`${file}|${JSON.stringify(ranges)}|${sessionId}`).digest('hex').slice(0, 6);
}

module.exports = { temporary, condition, itemId, RULES };
