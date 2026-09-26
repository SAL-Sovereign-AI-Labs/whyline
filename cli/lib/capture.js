'use strict';
// Turns one Bob (or Claude Code) hook payload into session lines. Must be cheap: one file read, one git call.
const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');
const session = require('./session');
const patch = require('./patch');

const WRITE_TOOLS = new Set(['write_file', 'write_to_file', 'apply_diff', 'insert_content', 'search_and_replace', 'Write', 'Edit', 'MultiEdit']);

// Accept both payload spellings: {hook_event_name, tool_name, tool_input, tool_response} and {event, tool, input, output}.
function normalize(p) {
  return {
    event: p.hook_event_name || p.event || '',
    session: String(p.session_id || ''),
    tool: p.tool_name || p.tool || '',
    input: p.tool_input || p.input || {},
    response: p.tool_response || p.output || '',
    prompt: p.prompt,
    cwd: p.cwd,
  };
}

function handle(payload, { cwd, now = new Date() } = {}) {
  const p = normalize(payload);
  const ts = now.toISOString();
  const workdir = p.cwd && fs.existsSync(p.cwd) ? p.cwd : cwd;
  if (p.event === 'UserPromptSubmit' && p.prompt) {
    const has = session.readAll(workdir).some(l => l.t === 'prompt' && l.session === p.session);
    if (!has) session.append(workdir, { t: 'prompt', session: p.session, ts, agent: guessAgent(payload), prompt: String(p.prompt).slice(0, 4000) });
    return 'prompt';
  }
  if (p.event !== 'PostToolUse' || !WRITE_TOOLS.has(p.tool)) return 'ignored';
  const filePath = p.input.path || p.input.file_path;
  if (!filePath) return 'ignored';
  const rel = git.relPath(workdir, filePath);
  if (!rel) return 'outside';
  const abs = path.join(git.repoRoot(workdir), rel);
  if (!fs.existsSync(abs) || isBinary(abs)) return 'skipped';
  const total = countLines(abs);
  let ranges, approx = false;
  if (p.tool === 'write_file' || p.tool === 'write_to_file' || p.tool === 'Write') {
    ranges = [[1, total]];
  } else {
    ranges = patch.addedRanges(patch.patchFromResponse(p.response));
    if (!ranges.length) { ranges = [[1, total]]; approx = true; }
  }
  const hunks = patch.parseHunks(patch.patchFromResponse(p.response));
  const hash = git.hashObject(workdir, abs);
  session.append(workdir, { t: 'write', session: p.session, ts, file: rel, tool: p.tool, ranges, hunks: approx ? [] : hunks, hash, total, approx });
  return 'write';
}

function guessAgent(p) {
  if (p.tool_name === 'Write' || p.tool_name === 'Edit' || p.transcript_path) return 'claude-code';
  return 'bob';
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

module.exports = { handle, normalize, countLines };
