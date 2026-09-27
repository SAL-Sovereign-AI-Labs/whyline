'use strict';
// render(data) -> self-contained HTML string. Reads report-template.html and injects
// the data as JSON assigned to window.WHYLINE_DATA. The '<' in strings is escaped to
// < so a prompt containing </script> cannot break out of the script block.
// collect(cwd, idx) -> the Why view's data: every file with AI lines at HEAD, line by line, via blame.
// gather(cwd) -> the full report data for one repo (same shape the router builds for `whyline report`).
// render() also lists the other projects named by WHYLINE_PROJECTS (':'-separated paths) and
// `git config --get-all whyline.project` (paths may be relative to the repo root), and embeds their
// data under data.others by repo basename. Only basenames are embedded, never paths.
const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');
const patch = require('./patch');

const TEMPLATE = path.join(__dirname, 'report-template.html');
const MAX_FILES = 60, MAX_LINES = 400, MAX_TEXT = 200; // keeps the page small on big repos

function render(data) {
  if (data && !Array.isArray(data.projects)) data = withProjects(data);
  const tmpl = fs.readFileSync(TEMPLATE, 'utf8');
  // Escape '<' as < to prevent </script> in string values from ending the block.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const injection = '<script>window.WHYLINE_DATA = ' + json + ';<\/script>';
  // function replacement: a prompt containing $& or $' must not be read as a replacement pattern
  return tmpl.replace('<script>', () => injection + '\n<script>');
}

function gather(cwd) {
  const lenses = require('./lenses');
  const root = git.repoRoot(cwd);
  if (!root) throw new Error('not a git repository');
  let bomMod = null;
  try { bomMod = require('./bom'); } catch { bomMod = null; }
  const tag = git.tryGit(['describe', '--tags', '--abbrev=0'], { cwd });
  const range = tag ? `${tag}..HEAD` : undefined;
  const idx = lenses.index(cwd);
  return {
    generatedAt: new Date().toISOString(),
    repo: path.basename(root),
    head: git.head(cwd),
    check: lenses.check(cwd),
    unreviewed: lenses.unreviewed(cwd),
    bom: bomMod ? (bomMod.bom || bomMod.run)(cwd, range) : null,
    why: collect(cwd, idx),
    sessions: [...idx.sessions.values()],
    ranges: idx.ranges,
    notes: idx.notes.length,
  };
}

// one line per project for the picker: name, AI share, due items, unreviewed files, notes
function summary(d, current) {
  const bom = d.bom || null;
  const ai = bom && bom.ai ? bom.ai.total : null;
  return {
    name: d.repo || 'repository', current: !!current,
    aiPct: ai != null && bom.linesChanged ? Math.round(ai / bom.linesChanged * 100) : null,
    due: ((d.check && d.check.due) || []).length,
    unreviewedFiles: (d.unreviewed && d.unreviewed.totals && d.unreviewed.totals.files) || 0,
    notes: d.notes || 0,
  };
}

function realRoot(p) {
  const r = git.repoRoot(p);
  if (!r) return null;
  try { return fs.realpathSync(r); } catch { return r; }
}

// the repo roots of the other projects, in order: WHYLINE_PROJECTS, then git config whyline.project
function projectRoots(cwd = process.cwd()) {
  const here = realRoot(cwd);
  const wanted = (process.env.WHYLINE_PROJECTS || '').split(':').filter(Boolean).map(p => path.resolve(cwd, p));
  if (here) {
    const conf = git.tryGit(['config', '--get-all', 'whyline.project'], { cwd: here }) || '';
    for (const p of conf.split('\n').map(x => x.trim()).filter(Boolean)) wanted.push(path.resolve(here, p));
  }
  const seen = new Set(here ? [here] : []), roots = [];
  for (const p of wanted) {
    const r = fs.existsSync(p) ? realRoot(p) : null;
    if (!r || seen.has(r)) continue;
    seen.add(r);
    roots.push(r);
  }
  return roots;
}

function withProjects(data) {
  const projects = [summary(data, true)];
  const others = {};
  const names = new Set([projects[0].name]);
  for (const root of projectRoots()) {
    let d;
    try { d = gather(root); } catch { continue; } // one broken project must not break the report
    let name = d.repo, n = 2;
    while (names.has(name)) name = `${d.repo}-${n++}`;
    names.add(name);
    d.repo = name;
    others[name] = d;
    projects.push(summary(d, false));
  }
  return { ...data, projects, others };
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

module.exports = { render, collect, gather, projectRoots };
