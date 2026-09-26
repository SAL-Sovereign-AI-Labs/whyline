'use strict';
// IBM Bob adapter (Bob IDE 2.2+, Bob Shell 2.x).
// Hook payload (verified live, Bob Shell 2.0.5): {session_id, cwd, hook_event_name, tool_name, tool_input, tool_response, tool_use_id}
// Docs show an older spelling {event, session_id, tool, input, output}; both are accepted.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const install = require('../shared/install');

const ASSETS = path.join(__dirname, 'assets');
const CONFIG_DIR = '.bob';
const WRITE_TOOLS = new Set(['write_file', 'write_to_file', 'apply_diff', 'insert_content', 'search_and_replace']);
const WHOLE_FILE_TOOLS = new Set(['write_file', 'write_to_file']);

function field(p, a, b) { return p[a] !== undefined ? p[a] : p[b]; }

// Bob and Claude Code share the {hook_event_name, session_id, tool_name, tool_input} shape. Claude payloads carry
// transcript_path and capitalized tool names (Write, Edit); Bob's are snake_case. Registry order puts more specific
// adapters first, so this stays permissive: any Bob-shaped payload without Claude markers is Bob.
function matches(p) {
  if (!p || typeof p !== 'object' || p.transcript_path) return false;
  const tool = field(p, 'tool_name', 'tool');
  if (typeof tool === 'string') return /^[a-z_]+$/.test(tool);
  const event = field(p, 'hook_event_name', 'event');
  return typeof event === 'string' && /^(SessionStart|UserPromptSubmit|PreToolUse|PostToolUse|PreCompact|PostCompact|Stop)$/.test(event);
}

function parseEvent(p) {
  const event = field(p, 'hook_event_name', 'event');
  const session = String(p.session_id || '');
  const cwd = p.cwd;
  if (event === 'UserPromptSubmit') return p.prompt ? { type: 'prompt', session, prompt: String(p.prompt), cwd } : null;
  if (event === 'SessionStart') return { type: 'session-start', session, cwd };
  if (event === 'Stop') return { type: 'stop', session, cwd };
  if (event !== 'PostToolUse') return null;
  const tool = field(p, 'tool_name', 'tool');
  if (!WRITE_TOOLS.has(tool)) return null;
  const input = field(p, 'tool_input', 'input') || {};
  if (!input.path) return null;
  const response = field(p, 'tool_response', 'output') || '';
  const m = typeof response === 'string' ? response.match(/<patch>([\s\S]*?)<\/patch>/) : null;
  return { type: 'write', session, tool, file: input.path, patch: m ? m[1] : '', cwd };
}

function isWholeFileTool(tool) { return WHOLE_FILE_TOOLS.has(tool); }

// Bob IDE and Bob Shell share ~/.bob/db/bob.db (tasks.costs JSON; verified 26 Sep 2026 from the IDE log "Task store opened").
// Read-only via the sqlite3 CLI. mode=ro sees rows still in the write-ahead log (the IDE keeps a WAL open while running);
// immutable=1 is the fallback when the WAL cannot be opened. Null when unavailable.
function sessionCost(session) {
  const db = process.env.WHYLINE_BOB_DB || path.join(os.homedir(), '.bob', 'db', 'bob.db');
  if (!fs.existsSync(db) || !/^[0-9a-f]{8,64}$/.test(session)) return null;
  const sql = `select costs from tasks where id='${session}' limit 1;`;
  for (const uri of [`file:${db}?mode=ro`, `file:${db}?mode=ro&immutable=1`]) {
    try {
      const out = execFileSync('sqlite3', [uri, sql], { encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      const j = out ? JSON.parse(out) : null;
      if (j && typeof j.cost === 'number') return j.cost;
    } catch { /* try the next open mode */ }
  }
  return null;
}

// Writes .bob/ (hooks merged into settings.json, skills) and the shared hook entry script.
function installInto(root) {
  const dst = path.join(root, CONFIG_DIR);
  const written = install.copyTree(ASSETS, dst, ['settings.json']);
  written.push(install.mergeHooks(path.join(ASSETS, 'settings.json'), path.join(dst, 'settings.json')));
  written.push(install.copyHookEntry(path.join(dst, 'hooks', 'whyline.sh')));
  return written.map(w => path.relative(root, w));
}

function installedIn(root) {
  const f = path.join(root, CONFIG_DIR, 'settings.json');
  if (!fs.existsSync(f)) return false;
  try { return JSON.stringify(JSON.parse(fs.readFileSync(f, 'utf8')).hooks || {}).includes('whyline'); } catch { return false; }
}

module.exports = { id: 'bob', name: 'IBM Bob', configDir: CONFIG_DIR, matches, parseEvent, isWholeFileTool, sessionCost, install: installInto, installedIn };
