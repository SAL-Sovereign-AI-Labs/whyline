'use strict';
// Append-only log of what agents wrote since the last commit. Lives inside .git so it never shows in the tree.
const fs = require('node:fs');
const path = require('node:path');
const { gitDir } = require('./git');

function dir(cwd) {
  const g = gitDir(cwd);
  if (!g) return null;
  const d = path.join(g, 'whyline');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function file(cwd) { const d = dir(cwd); return d ? path.join(d, 'session.jsonl') : null; }

function append(cwd, obj) {
  const f = file(cwd);
  if (!f) return false;
  fs.appendFileSync(f, JSON.stringify(obj) + '\n');
  return true;
}

function readAll(cwd) {
  const f = file(cwd);
  if (!f || !fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function rewrite(cwd, lines) {
  const f = file(cwd);
  if (!f) return;
  fs.writeFileSync(f, lines.map(l => JSON.stringify(l)).join('\n') + (lines.length ? '\n' : ''));
}

function logError(cwd, msg) {
  const d = dir(cwd);
  if (d) fs.appendFileSync(path.join(d, 'hook.err'), `${new Date().toISOString()} ${msg}\n`);
}

module.exports = { dir, file, append, readAll, rewrite, logError };
