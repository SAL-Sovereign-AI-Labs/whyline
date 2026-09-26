'use strict';
// post-commit: fold session lines into one git note on HEAD.
const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');
const session = require('./session');
const patch = require('./patch');
const classify = require('./classify');
const agents = require('./agents');

function isWholeFile(w) { const a = agents.byId(w.agent || 'bob'); return a ? a.isWholeFileTool(w.tool) : false; }

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

function run(cwd, { rev = 'HEAD' } = {}) {
  const lines = session.readAll(cwd);
  if (!lines.length) return { attached: false, reason: 'no session lines' };
  const commit = git.tryGit(['rev-parse', rev], { cwd });
  const files = git.committedFiles(cwd, rev);
  const byFile = new Map();
  for (const l of lines) if (l.t === 'write' && files.includes(l.file)) byFile.set(l.file, [...(byFile.get(l.file) || []), l]);
  if (!byFile.size) return { attached: false, reason: 'no committed files were written by an agent' };

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
    if (temp) {
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
  git.notesAdd(cwd, commit, note);
  const remaining = lines.filter(l => !(l.t === 'write' && byFile.has(l.file)));
  const liveSessions = new Set(remaining.filter(l => l.t === 'write').map(l => l.session));
  session.rewrite(cwd, remaining.filter(l => l.t !== 'prompt' || liveSessions.has(l.session)));
  return { attached: true, commit, note };
}

function rangeText(cwd, rev, file, ranges) {
  const text = git.tryGit(['show', `${rev}:${file}`], { cwd }) || '';
  const all = text.split('\n');
  return ranges.map(([s, e]) => all.slice(s - 1, e).join('\n')).join('\n');
}

module.exports = { run, foldWrites };
