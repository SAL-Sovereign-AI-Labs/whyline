'use strict';
// Rules that mark an agent write as temporary code. Deterministic, no model call.
const RULES = [
  { kind: 'mock', words: ['mock', 'stub', 'fake'], paths: [/(^|\/)mock_/, /(^|\/)fake_/, /\/mocks\//, /stub/] },
  { kind: 'demo', words: ['demo', 'example', 'sample', 'quick script'], paths: [/\/examples?\//, /\/demo\//, /(^|\/)demo_/, /(^|\/)sample_/] },
  { kind: 'flag', words: ['feature flag', 'behind a flag', 'toggle'], paths: [/flags?\.(ya?ml|json)$/, /feature_flags/] },
  { kind: 'shim', words: ['workaround', 'temporary', 'temporarily', 'until', 'shim', 'compat', 'hack', 'todo remove'], paths: [/(^|\/)compat_/, /_shim/, /(^|\/)legacy_/] },
  { kind: 'fixture', words: ['fixture', 'seed data', 'test data'], paths: [/\/fixtures\//, /(^|\/)seed/] },
];

function hasWord(text, w) {
  return new RegExp(`(^|[^a-z])${w.replace(/ /g, '\\s+')}([^a-z]|$)`, 'i').test(text);
}

// Returns {kind, reason} or null. Prompt words only count for files the agent created (created=true);
// an edit to an existing file that merely calls a mock is not itself temporary. Path rules always count.
function temporary(prompt, file, { created = true } = {}) {
  const p = String(prompt || '');
  const inTests = /(^|\/)tests?\//.test(file);
  for (const r of RULES) {
    const byWord = created && r.words.some(w => hasWord(p, w));
    const byPath = r.paths.some(re => re.test(file));
    if (!byWord && !byPath) continue;
    if (inTests && (r.kind === 'mock' || r.kind === 'fixture') && !hasWord(p, 'until')) continue;
    return { kind: r.kind, reason: reasonFrom(p) };
  }
  return null;
}

// "... until payments-v2 lands ..." -> "until payments-v2 lands"; else the first sentence.
function reasonFrom(prompt) {
  const m = prompt.match(/\b(until|before|for now|temporar\w+)\b[^.]*/i);
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
