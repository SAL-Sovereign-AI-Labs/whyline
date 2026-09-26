'use strict';
// post-commit: fold session lines into one git note on HEAD.
const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');
const session = require('./session');
const patch = require('./patch');
const classify = require('./classify');
const agents = require('./agents');

// A write replaces earlier ranges when it rewrote the whole file (new file via a whole-file tool, or an approximate write)
function isWholeFile(w) { if (w.whole !== undefined) return !!w.whole; const a = agents.byId(w.agent); return a ? a.isWholeFileTool(w.tool) : false; }

// Fold writes on one file, in order, into ranges relative to the last agent state.
function foldWrites(writes) {
  let ranges = [], lastHash = null, sessions = new Set();
  for (const w of writes) {
    if (isWholeFile(w) || w.approx) {
      ranges = w.ranges.map(r => [...r]);
    } else {
      const mapped = patch.mapRanges(ranges, w.hunks || []);
      ranges = patch.merge([...mapped.kept, ...mapped.edited, ...w.ranges]);
    }
    lastHash = w.hash;
    sessions.add(w.session);
  }
  return { ranges, lastHash, sessions: [...sessions] };
}

// A commit whose message names an item ("remove L-1a2b3c: ...") records that item as removed, whether the
// deletion was typed by a human or made by Bob through the whyline-remove skill. The item's file must be gone or its lines changed.
function recordRemovals(cwd, rev) {
  const msg = git.tryGit(['log', '-1', '--format=%B', rev], { cwd }) || '';
  const lenses = require('./lenses');
  const { items } = lenses.index(cwd);
  const sha = git.tryGit(['rev-parse', rev], { cwd });
  const deleted = new Set((git.tryGit(['show', '--name-only', '--format=', '--diff-filter=D', rev], { cwd }) || '').split('\n').filter(Boolean));
  const named = new Set(msg.match(/\bL-[0-9a-f]{6}\b/g) || []);
  const removed = [];
  for (const it of items.values()) {
    if (it.status === 'removed') continue;
    // an item's file deleted in this commit is removed, whatever the message says
    let gone = deleted.has(it.file);
    // a message that names the item (id or file name) with a removal word counts when the item's lines are gone
    if (!gone && /\bremov|\bdelet|\bdrop/i.test(msg) && (named.has(it.id) || msg.includes(it.file.split('/').pop()))) {
      const before = git.blobAt(cwd, `${rev}~1`, it.file), after = git.blobAt(cwd, rev, it.file);
      if (before && after && before !== after) {
        const hunks = git.diffHunks(cwd, before, after);
        const mapped = require('./patch').mapRanges(it.lines || [], hunks);
        gone = mapped.kept.length === 0; // every line of the item was changed or deleted
      }
    }
    if (!gone) continue;
    lenses.recordItemChange(cwd, it.id, { status: 'removed', reason: it.reason, removedIn: sha });
    removed.push(it.id);
  }
  return removed;
}

function run(cwd, { rev = 'HEAD' } = {}) {
  const removed = recordRemovals(cwd, rev);
  const lines = session.readAll(cwd);
  if (!lines.length) return { attached: removed.length > 0, removed, reason: 'no session lines' };
  const commit = git.tryGit(['rev-parse', rev], { cwd });
  const files = git.committedFiles(cwd, rev);
  const byFile = new Map();
  for (const l of lines) if (l.t === 'write' && files.includes(l.file)) byFile.set(l.file, [...(byFile.get(l.file) || []), l]);
  if (!byFile.size) return { attached: removed.length > 0, removed, reason: 'no committed files were written by an agent' };

  const prompts = new Map(lines.filter(l => l.t === 'prompt').map(l => [l.session, l]));
  const note = { v: 1, sessions: {}, ranges: [], items: [] };
  const author = git.userName(cwd);
  const usedSessions = new Set();

  for (const [file, writes] of byFile) {
    const folded = foldWrites(writes);
    const committed = git.blobAt(cwd, rev, file);
    if (!committed || !folded.lastHash) continue;
    const sessionId = folded.sessions[folded.sessions.length - 1];
    let ai = folded.ranges, edited = [];
    if (committed !== folded.lastHash) {
      const hunks = git.diffHunks(cwd, folded.lastHash, committed);
      const mapped = patch.mapRanges(folded.ranges, hunks);
      ai = mapped.kept; edited = mapped.edited;
    }
    for (const r of ai) note.ranges.push({ file, lines: r, origin: 'ai', session: sessionId });
    for (const r of edited) note.ranges.push({ file, lines: r, origin: 'ai-edited', session: sessionId });
    usedSessions.add(sessionId);

    const promptText = prompts.get(sessionId)?.prompt || '';
    const created = writes.some(isWholeFile) && !git.blobAt(cwd, `${rev}~1`, file);
    const temp = ai.length ? classify.temporary(promptText, file, { created }) : null;
    const alreadyTracked = [...require('./lenses').index(cwd).items.values()].some(i => i.file === file && i.status !== 'removed');
    if (temp && !alreadyTracked) {
      const content = rangeText(cwd, rev, file, ai);
      note.items.push({ id: classify.itemId(file, ai, sessionId), kind: temp.kind, file, lines: ai, session: sessionId,
        reason: temp.reason, condition: classify.condition(promptText, content), status: 'active', created: new Date().toISOString().slice(0, 10) });
    }
  }
  if (!note.ranges.length) return { attached: false, reason: 'agent content did not survive to the commit' };

  for (const s of usedSessions) {
    const p = prompts.get(s);
    const agentId = p?.agent || lines.find(l => l.t === 'write' && l.session === s)?.agent || 'bob';
    const adapter = agents.byId(agentId);
    note.sessions[s] = { agent: agentId, author, ts: p?.ts || null, prompt: p?.prompt || null, cost: adapter ? adapter.sessionCost(s) : null };
  }
  // a note may already sit on this commit: a removal record, or ranges carried over by `git commit --amend` (notes.rewriteRef)
  const existing = git.notesShow(cwd, commit);
  if (existing) {
    note.items = [...(existing.items || []), ...note.items];
    note.ranges = [...(existing.ranges || []).filter(r => !byFile.has(r.file)), ...note.ranges];
    note.sessions = { ...(existing.sessions || {}), ...note.sessions };
  }
  git.notesAdd(cwd, commit, note);
  // Consume only the lines used here (a capture may land while this runs), keep prompts (a session can span
  // several commits), and drop write lines whose agent output was discarded (file gone, or clean at HEAD with another hash).
  session.consume(cwd, l => {
    if (l.t !== 'write') return false;
    if (byFile.has(l.file)) return true;
    const abs = path.join(git.repoRoot(cwd), l.file);
    if (!fs.existsSync(abs)) return true;
    const clean = git.tryGit(['diff', '--quiet', 'HEAD', '--', l.file], { cwd }) !== null;
    return clean && git.blobAt(cwd, 'HEAD', l.file) !== l.hash;
  });
  return { attached: true, commit, note, removed };
}

function rangeText(cwd, rev, file, ranges) {
  const text = git.tryGit(['show', `${rev}:${file}`], { cwd }) || '';
  const all = text.split('\n');
  return ranges.map(([s, e]) => all.slice(s - 1, e).join('\n')).join('\n');
}

module.exports = { run, foldWrites, recordRemovals };
