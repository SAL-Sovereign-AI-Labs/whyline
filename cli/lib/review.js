'use strict';
// Review signals for AI-written lines. v1 signal: "a human (or later session) edited the line since the agent wrote it".
// git blame decides: a line still blamed to the commit whose note marks it `ai` is unchanged since, so unreviewed.
// Lines blamed elsewhere left the AI range (edited), and `ai-edited` ranges count as reviewed at commit time.
const git = require('./git');
const patch = require('./patch');

// Per-file blame of HEAD: [{line, commit, origFile, origLine}]
function blameFile(cwd, file) {
  const out = git.tryGit(['blame', '-w', '-M', '-C', '--line-porcelain', '--', file], { cwd });
  if (!out) return [];
  const rows = [];
  let cur = null;
  for (const l of out.split('\n')) {
    const h = l.match(/^([0-9a-f]{40}) (\d+) (\d+)(?: (\d+))?$/);
    if (h) { cur = { commit: h[1], origLine: +h[2], line: +h[3], origFile: file }; continue; }
    if (!cur) continue;
    if (l.startsWith('filename ')) cur.origFile = l.slice(9);
    else if (l.startsWith('\t')) { rows.push(cur); cur = null; }
  }
  return rows;
}

// Files that have at least one `ai` range in any note, with their current unreviewed AI lines.
// Returns [{file, aiLines:[n...], editedRanges:n, sessions:Set}]
function unreviewedByFile(cwd, index) {
  const byCommit = new Map();
  for (const r of index.ranges) {
    if (!byCommit.has(r.commit)) byCommit.set(r.commit, []);
    byCommit.get(r.commit).push(r);
  }
  const files = [...new Set(index.ranges.filter(r => r.origin === 'ai').map(r => r.file))];
  const out = [];
  for (const file of files) {
    if (!git.blobAt(cwd, 'HEAD', file)) continue; // deleted since
    const rows = blameFile(cwd, file);
    const aiLines = [], sessions = new Set();
    for (const row of rows) {
      const ranges = byCommit.get(row.commit);
      if (!ranges) continue;
      const hit = ranges.find(r => r.origin === 'ai' && r.file === row.origFile && patch.contains([r.lines], row.origLine));
      if (hit) { aiLines.push(row.line); sessions.add(hit.session); }
    }
    const editedRanges = index.ranges.filter(r => r.file === file && r.origin === 'ai-edited').length;
    if (aiLines.length || editedRanges) out.push({ file, aiLines, editedRanges, sessions: [...sessions] });
  }
  return out;
}

module.exports = { blameFile, unreviewedByFile };
