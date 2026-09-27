'use strict';
// whyline init [--agent <id>]...: install each requested adapter's config, then the git hooks (agent-independent).
const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');
const agents = require('./agents');

const GIT_HOOKS = {
  'post-commit': 'whyline commit; (whyline report >/dev/null 2>&1 &)',
  // GIT_TERMINAL_PROMPT=0: never wait on a hidden credential prompt; a remote without cached credentials is a no-op
  'post-merge': 'GIT_TERMINAL_PROMPT=0 git fetch origin refs/notes/whyline:refs/notes/whyline >/dev/null 2>&1; whyline check || true',
  // the notes push is itself a push, so guard against re-entering this hook
  'pre-push': '[ -n "$WHYLINE_PUSHING" ] && exit 0; WHYLINE_PUSHING=1 GIT_TERMINAL_PROMPT=0 git push origin refs/notes/whyline >/dev/null 2>&1 || true',
};
const GUARD = '#!/bin/sh\n# installed by whyline init. Never blocks: missing tool means no-op.\ncommand -v whyline >/dev/null 2>&1 || exit 0\n';

function run(cwd, { agentIds = ['bob'] } = {}) {
  const root = git.repoRoot(cwd);
  if (!root) { process.stderr.write('whyline init: this folder is not a git repository. Go to your project folder (or run git init first), then run whyline init again.\n'); return 3; }
  const written = [];

  for (const id of agentIds) {
    const adapter = agents.byId(id);
    if (!adapter) { process.stderr.write(`whyline init: unknown agent "${id}". Use one of: ${agents.all().map(a => a.id).join(', ')}\n`); return 1; }
    written.push(...adapter.install(root).map(w => `${w} (${adapter.name})`));
  }
  written.push(...installGitHooks(root));
  written.push(...configureNotes(root));

  const dirs = agentIds.map(id => agents.byId(id).configDir);
  console.log('Whyline is set up. Files written:\n  ' + written.join('\n  '));
  console.log(`\nFrom now on, each commit saves the request behind ${agentIds.map(id => agents.byId(id).name).join(' or ')}'s code in your git history (a git note, extra data attached to the commit; your files are not touched).`);
  console.log(`Next: commit the ${dirs.join(' and ')} folder so your team gets it (git add ${dirs.join(' ')} && git commit -m "Add Whyline"), then give ${agentIds.map(id => agents.byId(id).name).join(' or ')} a request as usual.`);
  return 0;
}

// Carry notes across amend and rebase (git drops them otherwise). notes.displayRef is set by the first
// `whyline commit` that writes a note, because git warns "refs/notes/whyline is invalid" while the ref does not exist.
function configureNotes(root) {
  git.git(['config', 'notes.rewriteRef', `refs/notes/${git.NOTES_REF}`], { cwd: root });
  return ['git config notes.rewriteRef (keeps the history when you amend or rebase; notes.displayRef is added with the first commit Whyline saves)'];
}

function installGitHooks(root) {
  const written = [];
  // honours core.hooksPath (husky, lefthook) and worktrees: git tells us where it will look
  const hooksPath = git.tryGit(['rev-parse', '--git-path', 'hooks'], { cwd: root }) || path.join(git.gitDir(root), 'hooks');
  const hooksDir = path.isAbsolute(hooksPath) ? hooksPath : path.join(root, hooksPath);
  if (!hooksDir.startsWith(git.gitDir(root))) written.push(`(core.hooksPath is set: hooks go to ${path.relative(root, hooksDir)})`);
  fs.mkdirSync(hooksDir, { recursive: true });
  // the generated report embeds prompts and must not be committed by accident; exclude it locally, never in the user's .gitignore
  const exclude = path.join(git.gitDir(root), 'info', 'exclude');
  fs.mkdirSync(path.dirname(exclude), { recursive: true });
  const cur = fs.existsSync(exclude) ? fs.readFileSync(exclude, 'utf8') : '';
  if (!cur.split('\n').includes('.whyline-report.html')) { fs.appendFileSync(exclude, (cur.endsWith('\n') || !cur ? '' : '\n') + '.whyline-report.html\n'); written.push('.git/info/exclude (+ .whyline-report.html)'); }
  for (const [name, cmd] of Object.entries(GIT_HOOKS)) {
    const f = path.join(hooksDir, name);
    if (fs.existsSync(f)) {
      // replace our own earlier lines (any older whyline command) and keep everything else the user had
      const cur = fs.readFileSync(f, 'utf8');
      if (cur.startsWith('#!') && !/^#!.*\b(sh|bash|zsh|dash)\b/.test(cur.split('\n')[0])) { written.push(`.git/hooks/${name} (left alone: not a shell script, add "${cmd}" to it yourself)`); continue; }
      const ours = l => /whyline/.test(l);
      const kept = cur.split('\n').filter(l => !ours(l));
      const body = kept.join('\n').replace(/\n+$/, '');
      const next = (body.startsWith('#!') ? body : `#!/bin/sh\n${body}`) + `\n# whyline\ncommand -v whyline >/dev/null 2>&1 || exit 0\n${cmd}\n`;
      if (next !== cur) { fs.writeFileSync(f, next); written.push(`.git/hooks/${name} (updated)`); }
    } else {
      fs.writeFileSync(f, `${GUARD}${cmd}\n`, { mode: 0o755 });
      written.push(`.git/hooks/${name}`);
    }
    fs.chmodSync(f, 0o755);
  }
  return written;
}

module.exports = { run, installGitHooks, configureNotes };
