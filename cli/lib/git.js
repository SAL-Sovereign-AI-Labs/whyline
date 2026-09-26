'use strict';
// Thin wrapper over the git binary. Every function takes cwd explicitly so tests can use temp repos.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const NOTES_REF = 'whyline';

function git(args, { cwd, input } = {}) {
  return execFileSync('git', args, { cwd, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).replace(/\n$/, '');
}

function tryGit(args, opts) {
  try { return git(args, opts); } catch { return null; }
}

function repoRoot(cwd) { return tryGit(['rev-parse', '--show-toplevel'], { cwd }); }
function gitDir(cwd) { return tryGit(['rev-parse', '--absolute-git-dir'], { cwd }); }
function head(cwd) { return tryGit(['rev-parse', 'HEAD'], { cwd }); }

// Repo-relative, forward-slash path, or null when outside the repo or inside .git.
function relPath(cwd, file) {
  const root = repoRoot(cwd);
  if (!root) return null;
  const abs = path.isAbsolute(file) ? file : path.join(cwd, file);
  const real = p => { try { return require('node:fs').realpathSync(p); } catch { return p; } };
  // realpath the parent so a not-yet-existing file still resolves through symlinked temp dirs
  const rootR = real(root), absR = path.join(real(path.dirname(abs)), path.basename(abs));
  // macOS and Windows file systems are case-insensitive and realpath does not always fix the case,
  // so compare case-insensitively and keep the caller's spelling for the remainder
  const ci = process.platform === 'darwin' || process.platform === 'win32';
  let rel;
  if (ci && absR.toLowerCase().startsWith(rootR.toLowerCase() + path.sep)) rel = absR.slice(rootR.length + 1);
  else rel = path.relative(rootR, absR);
  rel = rel.split(path.sep).join('/');
  if (rel.startsWith('..') || rel === '' || rel.split('/')[0] === '.git') return null;
  return rel;
}

// Store the file's current content as a blob so it can be diffed later. Returns the blob id.
function hashObject(cwd, file) { return tryGit(['hash-object', '-w', '--', file], { cwd }); }

// Blob id of a file at a revision (null if the file does not exist there).
function blobAt(cwd, rev, file) { return tryGit(['rev-parse', '--verify', '--quiet', `${rev}:${file}`], { cwd }); }

function committedFiles(cwd, rev = 'HEAD') {
  const out = tryGit(['show', '--name-only', '--format=', '--diff-filter=AM', rev], { cwd });
  return out ? out.split('\n').filter(Boolean) : [];
}

// Hunks of "git diff --unified=0 A B" as {oldStart, oldLen, newStart, newLen}.
function diffHunks(cwd, a, b) {
  let out;
  try { out = git(['diff', '--unified=0', '--no-color', a, b], { cwd }); } catch (e) { out = e.stdout || ''; }
  return require('./patch').parseHunks(out);
}

function notesAdd(cwd, commit, obj) {
  git(['notes', `--ref=${NOTES_REF}`, 'add', '-f', '-F', '-', commit], { cwd, input: JSON.stringify(obj) });
  // show notes in `git log` from the first note on (set earlier, git warns about the missing ref on every command)
  const shown = tryGit(['config', '--get-all', 'notes.displayRef'], { cwd }) || '';
  if (!shown.split('\n').includes(`refs/notes/${NOTES_REF}`)) tryGit(['config', '--add', 'notes.displayRef', `refs/notes/${NOTES_REF}`], { cwd });
}

function notesShow(cwd, commit) {
  const raw = tryGit(['notes', `--ref=${NOTES_REF}`, 'show', commit], { cwd });
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// All notes as [{commit, note}] in commit order (oldest first) for the current history.
function notesAll(cwd) {
  const list = tryGit(['notes', `--ref=${NOTES_REF}`, 'list'], { cwd });
  if (!list) return [];
  const noted = new Set(list.split('\n').filter(Boolean).map(l => l.split(' ')[1]));
  const log = tryGit(['log', '--format=%H', '--reverse'], { cwd }) || '';
  const out = [];
  for (const c of log.split('\n')) {
    if (!noted.has(c)) continue;
    const note = notesShow(cwd, c);
    if (note) out.push({ commit: c, note });
  }
  return out;
}

// Which commit introduced line n of file, and the path and line it had in that commit.
function blameLine(cwd, file, line) {
  const out = tryGit(['blame', '-w', '-M', '-C', '--line-porcelain', '-L', `${line},${line}`, '--', file], { cwd });
  if (!out) return null;
  const lines = out.split('\n');
  const [commit, origLine] = lines[0].split(' ');
  const fn = lines.find(l => l.startsWith('filename '));
  const author = lines.find(l => l.startsWith('author '));
  return { commit, origLine: +origLine, origFile: fn ? fn.slice(9) : file, author: author ? author.slice(7) : null };
}

function grep(cwd, pattern, excludes = []) {
  const args = ['grep', '-n', '-I', '-w', '-e', pattern, '--'];
  for (const x of excludes) args.push(`:!${x}`);
  const out = tryGit(args, { cwd });
  return out ? out.split('\n').filter(Boolean) : [];
}

function userName(cwd) { return tryGit(['config', 'user.name'], { cwd }) || process.env.USER || 'unknown'; }

module.exports = { NOTES_REF, git, tryGit, repoRoot, gitDir, head, relPath, hashObject, blobAt, committedFiles, diffHunks, notesAdd, notesShow, notesAll, blameLine, grep, userName };
