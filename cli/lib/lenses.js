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

// Evaluate each active item's condition. Returns {due:[], active:[], other:[]}.
function check(cwd, { today = new Date() } = {}) {
  const { items } = index(cwd);
  const due = [], active = [], other = [];
  for (const it of items.values()) {
    if (it.status !== 'active') { other.push(it); continue; }
    const r = evaluate(cwd, it, today);
    (r.due ? due : active).push({ ...it, evidence: r.evidence });
  }
  return { due, active, other };
}

function evaluate(cwd, it, today) {
  const c = it.condition || {};
  if (c.type === 'date') {
    const on = new Date(c.on + 'T00:00:00');
    return { due: today >= on, evidence: `date ${c.on}` };
  }
  if (c.type === 'no_references') {
    const excludes = [it.file, 'tests/**', 'test/**', '**/*_test.*', '**/test_*'];
    const stem = it.file.split('/').pop().replace(/\.[^.]+$/, '');
    const hits = [...new Set([...(c.symbol ? git.grep(cwd, c.symbol, excludes) : []), ...git.grep(cwd, stem, excludes)])];
    return { due: hits.length === 0, evidence: hits.length ? `${hits.length} reference(s): ${hits.slice(0, 3).join(' | ')}` : 'no references outside the file and its tests' };
  }
  return { due: false, evidence: 'unknown condition' };
}

module.exports = { index, why, check, evaluate };
