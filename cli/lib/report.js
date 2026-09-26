'use strict';
// render(data) -> self-contained HTML string. Reads report-template.html and injects
// the data as JSON assigned to window.WHYLINE_DATA. The '<' in strings is escaped to
// < so a prompt containing </script> cannot break out of the script block.
// collect(cwd, idx) -> the Why view's data: every file with AI lines at HEAD, line by line, via blame.
const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');
const patch = require('./patch');

const TEMPLATE = path.join(__dirname, 'report-template.html');
const MAX_FILES = 60, MAX_LINES = 400, MAX_TEXT = 200; // keeps the page small on big repos

function render(data) {
  const tmpl = fs.readFileSync(TEMPLATE, 'utf8');
  // Escape '<' as < to prevent </script> in string values from ending the block.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const injection = '<script>window.WHYLINE_DATA = ' + json + ';<\/script>';
  // function replacement: a prompt containing $& or $' must not be read as a replacement pattern
  return tmpl.replace('<script>', () => injection + '\n<script>');
}

// Same answer as `whyline why` for every line: blame at HEAD, then the note of the commit that introduced the line.
// Files deleted since are skipped; lines that moved keep their prompt. Human lines carry origin null.
function collect(cwd, idx = require('./lenses').index(cwd)) {
  const notes = new Map(idx.notes.map(n => [n.commit, n.note]));
  const items = [...idx.items.values()];
  const candidates = [...new Set(idx.ranges.map(r => r.file))].filter(f => git.blobAt(cwd, 'HEAD', f)).sort();
  const files = [];
  for (const file of candidates.slice(0, MAX_FILES)) {
    const code = blameFile(cwd, file).map(b => {
      const note = notes.get(b.commit);
      const range = note && (note.ranges || []).find(r => r.file === b.origFile && patch.contains([r.lines], b.origLine));
      const item = range && items.find(it => it.commit === b.commit && it.file === b.origFile && patch.contains(it.lines || [], b.origLine));
      return { n: b.line, text: b.text.slice(0, MAX_TEXT), origin: range ? range.origin : null, session: range ? range.session : null,
        item: item ? item.id : null, commit: b.commit.slice(0, 7) };
    });
    const aiLines = code.filter(l => l.origin).length;
    if (!aiLines) continue; // every AI line was rewritten by a human since: nothing to explain here
    files.push({ file, lines: code.length, aiLines, truncated: code.length > MAX_LINES, code: code.slice(0, MAX_LINES) });
  }
  return { files, skipped: Math.max(0, candidates.length - MAX_FILES) };
}

function blameFile(cwd, file) {
  const out = git.tryGit(['blame', '-w', '-M', '-C', '--line-porcelain', 'HEAD', '--', file], { cwd });
  if (!out) return [];
  const rows = [];
  let cur = null;
  for (const l of out.split('\n')) {
    const h = l.match(/^([0-9a-f]{40}) (\d+) (\d+)/);
    if (h) { cur = { commit: h[1], origLine: +h[2], line: +h[3], origFile: file }; continue; }
    if (!cur) continue;
    if (l.startsWith('filename ')) cur.origFile = l.slice(9);
    else if (l.startsWith('\t')) { rows.push({ ...cur, text: l.slice(1) }); cur = null; }
  }
  return rows;
}

module.exports = { render, collect };
