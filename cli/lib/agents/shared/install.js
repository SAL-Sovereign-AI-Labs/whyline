'use strict';
// Helpers every adapter's install() uses: copy an assets tree, merge a hooks block into an existing JSON settings file,
// place the shared shell entry script. Idempotent: running twice changes nothing.
const fs = require('node:fs');
const path = require('node:path');

const HOOK_ENTRY = path.join(__dirname, 'hook-entry.sh');

function copyTree(src, dst, skip = []) {
  const written = [];
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(d, { recursive: true }); written.push(...copyTree(s, d)); continue; }
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.copyFileSync(s, d);
    written.push(d);
  }
  return written;
}

// Merge src.hooks into dst (created if missing). A hook is identified by its command string, so re-running never duplicates.
function mergeHooks(srcFile, dstFile) {
  const src = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
  const cur = fs.existsSync(dstFile) ? JSON.parse(fs.readFileSync(dstFile, 'utf8')) : {};
  cur.hooks = cur.hooks || {};
  for (const [event, groups] of Object.entries(src.hooks || {})) {
    for (const g of groups) for (const h of g.hooks) addHook(cur.hooks, event, g.matcher, h.command, h.timeout);
  }
  fs.mkdirSync(path.dirname(dstFile), { recursive: true });
  fs.writeFileSync(dstFile, JSON.stringify(cur, null, 2) + '\n');
  return dstFile;
}

function addHook(hooks, event, matcher, command, timeout = 5) {
  hooks[event] = hooks[event] || [];
  if (hooks[event].some(g => (g.hooks || []).some(h => h.command === command))) return false;
  const group = { hooks: [{ type: 'command', command, timeout }] };
  if (matcher) group.matcher = matcher;
  hooks[event].push(group);
  return true;
}

function copyHookEntry(dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(HOOK_ENTRY, dst);
  fs.chmodSync(dst, 0o755);
  return dst;
}

module.exports = { copyTree, mergeHooks, addHook, copyHookEntry };
