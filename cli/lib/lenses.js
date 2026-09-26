'use strict';
// Read-only questions over the notes: why, check. (unreviewed, bom come next.)
const git = require('./git');
const patch = require('./patch');

// Latest state of every item and every range, folded over all notes.
function index(cwd) {
  const notes = git.notesAll(cwd);
  const items = new Map(), ranges = [], sessions = new Map();
  for (const { commit, note } of notes) {
    for (const [id, s] of Object.entries(note.sessions || {})) sessions.set(id, { ...s, id, commit });
    for (const r of note.ranges || []) ranges.push({ ...r, commit });
    for (const it of note.items || []) {
      const prev = items.get(it.id) || {};
      items.set(it.id, { ...prev, ...it, commit: prev.commit || commit });
    }
  }
  return { notes, items, ranges, sessions };
}

function why(cwd, file, line) {
  const b = git.blameLine(cwd, file, line);
  if (!b) return { found: false, reason: 'git blame failed (file not tracked?)' };
  const note = git.notesShow(cwd, b.commit);
  const range = note && (note.ranges || []).find(r => r.file === b.origFile && patch.contains([r.lines], b.origLine));
  if (!range) return { found: true, origin: 'human', commit: b.commit, author: b.author };
  const s = note.sessions?.[range.session] || {};
  const item = (note.items || []).find(it => it.file === range.file && patch.contains(it.lines, b.origLine));
  const siblings = (note.ranges || []).filter(r => r.session === range.session && !(r.file === range.file && r.lines[0] === range.lines[0])).map(r => `${r.file}:${r.lines[0]}-${r.lines[1]}`);
  return { found: true, origin: range.origin, commit: b.commit, session: range.session, agent: s.agent, author: s.author, ts: s.ts, cost: s.cost, prompt: s.prompt, siblings, item: item ? latestItem(cwd, item.id) : null };
}

function latestItem(cwd, id) { return index(cwd).items.get(id) || null; }

// Lifecycle: active -> due -> kept | removed. `active` and `due` are computed from the repo every run;
// `kept` and `removed` are recorded decisions. Returns {due, active, other, counts}. Every item carries `state`.
const LIFECYCLE = ['active', 'due', 'kept', 'removed'];

function check(cwd, { today = new Date() } = {}) {
  const { items } = index(cwd);
  const due = [], active = [], other = [];
  for (const it of items.values()) {
    if (it.status !== 'active') { other.push({ ...it, state: it.status }); continue; }
    const r = evaluate(cwd, it, today);
    const state = r.due ? 'due' : 'active';
    (r.due ? due : active).push({ ...it, state, evidence: r.evidence });
  }
  const counts = Object.fromEntries(LIFECYCLE.map(k => [k, 0]));
  for (const it of [...due, ...active, ...other]) counts[it.state] = (counts[it.state] || 0) + 1;
  return { due, active, other, counts };
}

// Humans and agents name things, not ids. Accepts an id (L-xxxxxx), a file path or its suffix, a watched symbol,
// or a kind when only one item of that kind exists. Returns the item, or throws with the candidates named.
function resolveItem(cwd, ref, { items } = index(cwd)) {
  const all = [...items.values()];
  const r = String(ref || '').trim();
  if (!r) throw new Error('name an item: its id, file, symbol or kind (run: whyline check)');
  const byId = items.get(r);
  if (byId) return byId;
  const lower = r.toLowerCase();
  const live = all.filter(i => i.status !== 'removed');
  const pick = list => {
    if (list.length === 1) return list[0];
    if (list.length > 1) throw new Error(`"${r}" matches ${list.length} items: ${list.map(i => `${i.id} (${i.file})`).join(', ')}. Use the id.`);
    return null;
  };
  return pick(live.filter(i => i.file === r || i.file.endsWith('/' + r) || i.file.toLowerCase().endsWith(lower)))
    || pick(live.filter(i => i.condition && i.condition.symbol && i.condition.symbol.toLowerCase() === lower))
    || pick(live.filter(i => i.kind === lower))
    || pick(live.filter(i => i.file.toLowerCase().includes(lower) || String(i.reason || '').toLowerCase().includes(lower)))
    || (() => { throw new Error(`no item matches "${r}" (run: whyline check to see ids, files and kinds)`); })();
}

// Record a decision or a condition change for an item as a note on HEAD (folded by readers, latest wins).
function recordItemChange(cwd, ref, change) {
  const head = git.head(cwd);
  if (!head) throw new Error('not a git repository with commits');
  const id = resolveItem(cwd, ref).id;
  const note = git.notesShow(cwd, head) || { v: 1, sessions: {}, ranges: [], items: [] };
  // if the item was born on HEAD itself, keep its original fields and layer the change on top
  const existing = (note.items || []).find(i => i.id === id) || {};
  note.items = [...(note.items || []).filter(i => i.id !== id), { ...existing, id, ...change, by: git.userName(cwd), at: new Date().toISOString() }];
  git.notesAdd(cwd, head, note);
  return head;
}

// AI lines in HEAD that no human has edited since the agent wrote them, per file, with coverage when a report exists.
function unreviewed(cwd) {
  const review = require('./review');
  const coverage = require('./coverage');
  const idx = index(cwd);
  const root = git.repoRoot(cwd);
  const cov = coverage.load(root);
  const files = review.unreviewedByFile(cwd, idx).map(f => {
    const c = coverage.forLines(cov, f.file, f.aiLines);
    return { file: f.file, aiLines: f.aiLines.length, editedRanges: f.editedRanges, sessions: f.sessions,
      coverage: c && c.measured ? Math.round(100 * c.covered / c.measured) : null };
  }).sort((a, b) => b.aiLines - a.aiLines);
  const totals = { aiLines: files.reduce((n, f) => n + f.aiLines, 0), files: files.filter(f => f.aiLines > 0).length, coverageSource: cov ? cov.source : null };
  const missing = [];
  if (!cov) missing.push('coverage');
  return { files, totals, missing };
}

function evaluate(cwd, it, today) {
  const c = it.condition || {};
  if (c.type === 'date') {
    const on = new Date(c.on + 'T00:00:00');
    const due = today >= on;
    return { due, evidence: { summary: due ? `date ${c.on} has passed` : `until ${c.on}`, references: [] } };
  }
  if (c.type === 'no_references') {
    // a fixture exists for tests, so references from tests count for it; for everything else tests are excluded
    // documentation, agent config and skills mention things without using them, so they never count as references
    const docs = ['.bob/**', '.claude/**', '*.md', 'docs/**', '*.txt']; // in git pathspecs '*' also matches '/'
    const excludes = it.kind === 'fixture' ? [it.file, ...docs] : [it.file, 'tests/**', 'test/**', '**/*_test.*', '**/test_*', ...docs];
    const stem = it.file.split('/').pop().replace(/\.[^.]+$/, '');
    const hits = [...new Set([...(c.symbol ? git.grep(cwd, c.symbol, excludes) : []), ...git.grep(cwd, stem, excludes)])];
    const references = hits.map(h => { const m = h.match(/^([^:]+):(\d+):(.*)$/); return m ? { file: m[1], line: +m[2], text: m[3].trim().slice(0, 80) } : { file: h, line: null, text: '' }; });
    const summary = references.length ? `${references.length} reference${references.length === 1 ? '' : 's'}: ${references.slice(0, 2).map(r => `${r.file}:${r.line}`).join(', ')}${references.length > 2 ? ', ...' : ''}` : 'no references outside the file and its tests';
    return { due: references.length === 0, evidence: { summary, references } };
  }
  return { due: false, evidence: { summary: 'unknown condition', references: [] } };
}

module.exports = { index, why, check, evaluate, unreviewed, recordItemChange, resolveItem, LIFECYCLE };
