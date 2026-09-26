'use strict';
// whyline init: copy bob/ into .bob/, merge hooks into an existing settings.json, install git hooks.
const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');

const BOB_SRC = path.join(__dirname, '..', '..', 'bob');
const GIT_HOOKS = {
  'post-commit': 'whyline commit',
  'post-merge': 'git fetch origin refs/notes/whyline:refs/notes/whyline >/dev/null 2>&1; whyline check || true',
  'pre-push': 'git push origin refs/notes/whyline >/dev/null 2>&1 || true',
};
const GUARD = `#!/bin/sh
# installed by whyline init. Never blocks: missing tool means no-op.
command -v whyline >/dev/null 2>&1 || exit 0
`;

function run(cwd, { claude = false } = {}) {
  const root = git.repoRoot(cwd);
  if (!root) { process.stderr.write('whyline init: not inside a git repository\n'); return 3; }
  const written = [];

  // 1. .bob files
  const dst = path.join(root, '.bob');
  copyTree(path.join(BOB_SRC), dst, written, ['settings.json']);
  mergeSettings(path.join(BOB_SRC, 'settings.json'), path.join(dst, 'settings.json'), written);

  // 2. git hooks
  const hooksDir = path.join(git.gitDir(root), 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  for (const [name, cmd] of Object.entries(GIT_HOOKS)) {
    const f = path.join(hooksDir, name);
    const line = `${cmd}\n`;
    if (fs.existsSync(f)) {
      const cur = fs.readFileSync(f, 'utf8');
      if (!cur.includes(cmd)) { fs.appendFileSync(f, `\n# whyline\n${GUARD.split('\n').slice(2).join('\n')}${line}`); written.push(`${name} (appended)`); }
    } else {
      fs.writeFileSync(f, GUARD + line, { mode: 0o755 });
      written.push(name);
    }
    fs.chmodSync(f, 0o755);
  }

  // 3. optional Claude Code hooks (same command)
  if (claude) {
    const cDir = path.join(root, '.claude');
    fs.mkdirSync(cDir, { recursive: true });
    const f = path.join(cDir, 'settings.json');
    const cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    cur.hooks = cur.hooks || {};
    addHook(cur.hooks, 'UserPromptSubmit', undefined, 'sh .bob/hooks/whyline.sh capture');
    addHook(cur.hooks, 'PostToolUse', 'Write|Edit|MultiEdit', 'sh .bob/hooks/whyline.sh capture');
    fs.writeFileSync(f, JSON.stringify(cur, null, 2) + '\n');
    written.push('.claude/settings.json');
  }

  console.log('whyline installed:\n  ' + written.join('\n  '));
  console.log('\nNext: commit the .bob/ folder so your team gets the hooks. Open the repo in Bob IDE and start a task.');
  return 0;
}

function copyTree(src, dst, written, skip = []) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyTree(s, d, written); continue; }
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.copyFileSync(s, d);
    if (entry.name.endsWith('.sh')) fs.chmodSync(d, 0o755);
    written.push(path.relative(path.dirname(dst), d));
  }
}

function mergeSettings(srcFile, dstFile, written) {
  const src = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
  const cur = fs.existsSync(dstFile) ? JSON.parse(fs.readFileSync(dstFile, 'utf8')) : {};
  cur.hooks = cur.hooks || {};
  for (const [event, groups] of Object.entries(src.hooks)) {
    for (const g of groups) for (const h of g.hooks) addHook(cur.hooks, event, g.matcher, h.command, h.timeout);
  }
  fs.writeFileSync(dstFile, JSON.stringify(cur, null, 2) + '\n');
  written.push('.bob/settings.json (merged)');
}

// Idempotent: a hook is identified by its command string.
function addHook(hooks, event, matcher, command, timeout = 5) {
  hooks[event] = hooks[event] || [];
  const exists = hooks[event].some(g => (g.hooks || []).some(h => h.command === command));
  if (exists) return;
  const group = { hooks: [{ type: 'command', command, timeout }] };
  if (matcher) group.matcher = matcher;
  hooks[event].push(group);
}

module.exports = { run, addHook, mergeSettings };
