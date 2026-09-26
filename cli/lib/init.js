'use strict';
// whyline init [--agent <id>]...: install each requested adapter's config, then the git hooks (agent-independent).
const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');
const agents = require('./agents');

const GIT_HOOKS = {
  'post-commit': 'whyline commit; (whyline report >/dev/null 2>&1 &)',
  'post-merge': 'git fetch origin refs/notes/whyline:refs/notes/whyline >/dev/null 2>&1; whyline check || true',
  'pre-push': 'git push origin refs/notes/whyline >/dev/null 2>&1 || true',
};
const GUARD = '#!/bin/sh\n# installed by whyline init. Never blocks: missing tool means no-op.\ncommand -v whyline >/dev/null 2>&1 || exit 0\n';

function run(cwd, { agentIds = ['bob'] } = {}) {
  const root = git.repoRoot(cwd);
  if (!root) { process.stderr.write('whyline init: not inside a git repository\n'); return 3; }
  const written = [];

  for (const id of agentIds) {
    const adapter = agents.byId(id);
    if (!adapter) { process.stderr.write(`whyline init: unknown agent "${id}". Known: ${agents.all().map(a => a.id).join(', ')}\n`); return 1; }
    written.push(...adapter.install(root).map(w => `${w} (${adapter.name})`));
  }
  written.push(...installGitHooks(root));
  written.push(...configureNotes(root));

  console.log('whyline installed:\n  ' + written.join('\n  '));
  console.log(`\nNext: commit the ${agentIds.map(id => agents.byId(id).configDir).join(' and ')} folder so your team gets the hooks, then start a task in ${agentIds.map(id => agents.byId(id).name).join(' or ')}.`);
  return 0;
}

// Carry notes across amend and rebase (git drops them otherwise). notes.displayRef is set by the first
// `whyline commit` that writes a note, because git warns "refs/notes/whyline is invalid" while the ref does not exist.
function configureNotes(root) {
  git.git(['config', 'notes.rewriteRef', `refs/notes/${git.NOTES_REF}`], { cwd: root });
  return ['git config notes.rewriteRef (notes.displayRef is added with the first note)'];
}

function installGitHooks(root) {
  const written = [];
  const hooksDir = path.join(git.gitDir(root), 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  for (const [name, cmd] of Object.entries(GIT_HOOKS)) {
    const f = path.join(hooksDir, name);
    if (fs.existsSync(f)) {
      const cur = fs.readFileSync(f, 'utf8');
      if (!cur.includes(cmd)) { fs.appendFileSync(f, `\n# whyline\ncommand -v whyline >/dev/null 2>&1 || exit 0\n${cmd}\n`); written.push(`.git/hooks/${name} (appended)`); }
    } else {
      fs.writeFileSync(f, `${GUARD}${cmd}\n`, { mode: 0o755 });
      written.push(`.git/hooks/${name}`);
    }
    fs.chmodSync(f, 0o755);
  }
  return written;
}

module.exports = { run, installGitHooks, configureNotes };
