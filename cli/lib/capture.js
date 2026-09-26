'use strict';
// Agent-agnostic capture: a raw hook payload is handed to the matching adapter, which returns a normalized event.
// Must be cheap: one file read, one git call.
const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');
const session = require('./session');
const patch = require('./patch');
const agents = require('./agents');

// opts.agent: adapter id from the installed hook command (--agent bob). Falls back to detection by payload shape.
function handle(payload, { cwd, agent, now = new Date() } = {}) {
  const adapter = (agent && agents.byId(agent)) || agents.detect(payload);
  if (!adapter) return 'ignored';
  const ev = adapter.parseEvent(payload);
  if (!ev) return 'ignored';
  const ts = now.toISOString();
  const workdir = ev.cwd && fs.existsSync(ev.cwd) ? ev.cwd : cwd;

  if (ev.type === 'prompt') {
    // the first prompt of a session is the intent; later steering prompts do not replace it
    const has = session.readAll(workdir).some(l => l.t === 'prompt' && l.session === ev.session);
    if (!has) session.append(workdir, { t: 'prompt', session: ev.session, ts, agent: adapter.id, prompt: ev.prompt.slice(0, 4000) });
    return 'prompt';
  }
  if (ev.type !== 'write') return 'ignored';

  const rel = git.relPath(workdir, ev.file);
  if (!rel) return 'outside';
  const abs = path.join(git.repoRoot(workdir), rel);
  if (!fs.existsSync(abs) || isBinary(abs)) return 'skipped';
  const total = countLines(abs);
  let ranges, approx = false, hunks = [], whole = false;
  const headBlob = adapter.isWholeFileTool(ev.tool) ? git.blobAt(workdir, 'HEAD', rel) : null;
  if (adapter.isWholeFileTool(ev.tool) && !headBlob) {
    ranges = [[1, total]]; whole = true; // a new file: every line is the agent's
  } else if (adapter.isWholeFileTool(ev.tool)) {
    // the agent rewrote an existing file: only the lines that differ from HEAD are the agent's
    const newBlob = git.hashObject(workdir, abs);
    hunks = git.diffHunks(workdir, headBlob, newBlob);
    ranges = patch.merge(hunks.filter(h => h.newLen > 0).map(h => [h.newStart, h.newStart + h.newLen - 1]));
    if (!hunks.length && !ranges.length) return 'unchanged';
  } else {
    hunks = patch.parseHunks(ev.patch);
    ranges = patch.addedRanges(ev.patch);
    if (!ranges.length) { ranges = [[1, total]]; approx = true; hunks = []; }
  }
  const hash = git.hashObject(workdir, abs);
  session.append(workdir, { t: 'write', session: ev.session, ts, agent: adapter.id, file: rel, tool: ev.tool, ranges, hunks, hash, total, approx, whole });
  return 'write';
}

function countLines(abs) {
  const buf = fs.readFileSync(abs);
  if (buf.length === 0) return 0;
  let n = 0;
  for (const b of buf) if (b === 10) n++;
  return buf[buf.length - 1] === 10 ? n : n + 1;
}

function isBinary(abs) {
  const fd = fs.openSync(abs, 'r');
  const buf = Buffer.alloc(8000);
  const n = fs.readSync(fd, buf, 0, 8000, 0);
  fs.closeSync(fd);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

module.exports = { handle, countLines };
