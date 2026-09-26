'use strict';
// whyline seed: first run on an existing repository. Finds temporary-looking code that predates Whyline
// (comment markers, flag files, mock and compat names, examples and fixtures folders) and records each as an item
// with a recovered reason and its age from git. Nothing is written for files that already have an item.
const git = require('./git');
const classify = require('./classify');
const lenses = require('./lenses');

const MARKER = /\b(TODO\s*remove|TODO\s*\(?remove|FIXME|HACK|XXX|temporary|temporarily|workaround|remove (this|me|after|once|when)|until [A-Za-z0-9._-]+ (lands|ships|is merged|is done))\b/i;
const CODE_EXCLUDES = ['.bob/**', '.claude/**', '*.md', '*.txt', 'docs/**', 'node_modules/**', '*.lock', '*.json'];

function scan(cwd) {
  const found = new Map(); // file -> {line, text}
  const hits = git.tryGit(['grep', '-n', '-I', '-i', '-E', '-e', 'TODO ?\\(?remove|FIXME|HACK|XXX|temporar|workaround|remove (this|me|after|once|when)|until [A-Za-z0-9._-]+ (lands|ships|is merged|is done)', '--', ...CODE_EXCLUDES.map(x => `:!${x}`)], { cwd }) || '';
  for (const h of hits.split('\n').filter(Boolean)) {
    const m = h.match(/^([^:]+):(\d+):(.*)$/);
    if (!m || !MARKER.test(m[3])) continue;
    if (!found.has(m[1])) found.set(m[1], { line: +m[2], text: m[3].trim().replace(/^[#/*\s-]+/, '').slice(0, 140) });
  }
  const files = (git.tryGit(['ls-files'], { cwd }) || '').split('\n').filter(Boolean);
  for (const f of files) {
    if (found.has(f)) continue;
    const t = classify.temporary('', f, { created: false }); // path rules only
    if (t) found.set(f, { line: 1, text: `${t.kind} by file name` });
  }
  return found;
}

function run(cwd, { dryRun = false } = {}) {
  const head = git.head(cwd);
  if (!head) return { error: 'not a git repository with commits' };
  const idx = lenses.index(cwd);
  const known = new Set([...idx.items.values()].map(i => i.file));
  const candidates = scan(cwd);
  const items = [];
  for (const [file, hit] of candidates) {
    if (known.has(file)) continue;
    const kindByPath = classify.temporary('', file, { created: false });
    const kind = kindByPath ? kindByPath.kind : (/mock|stub|fake/i.test(hit.text) ? 'mock' : /flag/i.test(hit.text) ? 'flag' : 'shim');
    const text = git.tryGit(['show', `HEAD:${file}`], { cwd }) || '';
    const lines = text.split('\n').length;
    const firstSeen = git.tryGit(['log', '--diff-filter=A', '--format=%ad', '--date=short', '--follow', '--', file], { cwd });
    const created = firstSeen ? firstSeen.split('\n').pop() : null;
    const author = git.tryGit(['log', '--diff-filter=A', '--format=%an', '--follow', '--', file], { cwd });
    const cond = classify.condition(hit.text, text);
    items.push({ id: classify.itemId(file, [[1, lines]], 'seed'), kind, file, lines: [[1, Math.max(1, lines)]], session: 'seed',
      reason: hit.text, condition: cond, status: 'active', created: created || new Date().toISOString().slice(0, 10),
      seeded: { markerLine: hit.line, firstCommitBy: author ? author.split('\n').pop() : null } });
  }
  if (!dryRun && items.length) {
    const note = git.notesShow(cwd, head) || { v: 1, sessions: {}, ranges: [], items: [] };
    note.sessions.seed = note.sessions.seed || { agent: 'seed', author: git.userName(cwd), ts: new Date().toISOString(), prompt: 'recovered from existing code by whyline seed (comment markers, file names, folders)', cost: null };
    note.items = [...(note.items || []), ...items];
    git.notesAdd(cwd, head, note);
  }
  return { head, items, skipped: [...candidates.keys()].filter(f => known.has(f)).length };
}

module.exports = { run, scan };
