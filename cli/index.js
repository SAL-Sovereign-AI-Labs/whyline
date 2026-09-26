#!/usr/bin/env node
'use strict';
// whyline: provenance for AI-written code. Commands never throw at the agent: hook commands always exit 0.
const fs = require('node:fs');

const USAGE = `whyline <command> [--json]

  init [--agent bob]        install the agent's hooks (.bob/) and git hooks in this repo
  capture [--agent bob]     hook: read a hook payload on stdin, record the write
  session-start             hook: print a one-line summary for Bob's context
  commit                    git post-commit: attach the provenance note to HEAD
  why <file>:<line>         who wrote this line, and why
  check [--json]            temporary items that are due (exit 2 when any)
  keep <id> "<reason>"      mark an item permanent
  until <id> <YYYY-MM-DD>   change an item's condition to a date
  --version, --help

Exit codes: 0 ok, 1 usage or error, 2 check found due items, 3 not a git repository.
Env: WHYLINE_DEBUG=1 prints stack traces to stderr. WHYLINE_BOB_DB overrides the Bob database path.
`;

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

const DEBUG = !!process.env.WHYLINE_DEBUG;
function debug(area, msg) { if (DEBUG) process.stderr.write(`[whyline:${area}] ${msg}\n`); }

function main(argv) {
  try { return dispatch(argv); } catch (e) {
    process.stderr.write(`whyline: ${e && e.message ? e.message : String(e)}\n`);
    debug('main', e && e.stack ? e.stack : '');
    return 1;
  }
}

function dispatch(argv) {
  const [cmd, ...rest] = argv;
  const cwd = process.cwd();
  const json = rest.includes('--json');
  const agentIds = [];
  const args = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--json') continue;
    if (rest[i] === '--agent') { if (rest[i + 1]) agentIds.push(rest[++i]); continue; }
    args.push(rest[i]);
  }
  switch (cmd) {
    case '--version': case '-v':
      console.log(require('../package.json').version);
      return 0;
    case '--help': case '-h': case 'help':
      process.stdout.write(USAGE);
      return 0;
    case 'capture': {
      const session = require('./lib/session');
      try {
        const payload = JSON.parse(readStdin() || '{}');
        require('./lib/capture').handle(payload, { cwd, agent: agentIds[0] });
      } catch (e) { session.logError(cwd, `capture: ${e.message}`); debug('capture', e.stack || ''); }
      return 0;
    }
    case 'session-start': {
      try {
        const r = require('./lib/lenses').check(cwd);
        if (r.due.length) process.stdout.write(`whyline: ${r.due.length} temporary item(s) due for removal (run: whyline check)\n`);
      } catch { /* silent by design */ }
      return 0;
    }
    case 'commit': {
      try {
        const r = require('./lib/commit').run(cwd);
        if (r.attached) process.stderr.write(`whyline: note attached to ${r.commit.slice(0, 7)} (${r.note.ranges.length} range(s), ${r.note.items.length} item(s))\n`);
      } catch (e) { require('./lib/session').logError(cwd, `commit: ${e.message}`); }
      return 0;
    }
    case 'why': {
      const m = (args[0] || '').match(/^(.+):(\d+)$/);
      if (!m) { process.stderr.write('usage: whyline why <file>:<line>\n'); return 1; }
      const r = require('./lib/lenses').why(cwd, m[1], +m[2]);
      if (json) { console.log(JSON.stringify(r, null, 2)); return 0; }
      printWhy(m[1], +m[2], r);
      return 0;
    }
    case 'check': {
      const r = require('./lib/lenses').check(cwd);
      if (json) { console.log(JSON.stringify(r, null, 2)); return r.due.length ? 2 : 0; }
      for (const it of r.due) console.log(`due     ${it.id}  ${it.kind.padEnd(7)} ${it.file}:${it.lines.map(x => x.join('-')).join(',')}  ${it.evidence}  "${it.reason}"`);
      for (const it of r.active) console.log(`active  ${it.id}  ${it.kind.padEnd(7)} ${it.file}  ${it.evidence}`);
      console.log(`${r.active.length} active, ${r.due.length} due, ${r.other.length} kept/removed.${r.due.length ? ' Ask Bob: "remove <id>"' : ''}`);
      return r.due.length ? 2 : 0;
    }
    case 'keep':
    case 'until': {
      const id = args[0], value = args[1];
      if (!id || !value) { process.stderr.write(`usage: whyline ${cmd} <id> ${cmd === 'keep' ? '"<reason>"' : '<YYYY-MM-DD>'}\n`); return 1; }
      const git = require('./lib/git');
      const head = git.head(cwd);
      const note = git.notesShow(cwd, head) || { v: 1, sessions: {}, ranges: [], items: [] };
      const patchItem = cmd === 'keep' ? { id, status: 'kept', reason: value } : { id, status: 'active', condition: { type: 'date', on: value } };
      note.items = [...(note.items || []).filter(i => i.id !== id), { ...patchItem, by: git.userName(cwd), at: new Date().toISOString() }];
      git.notesAdd(cwd, head, note);
      console.log(`${id}: ${cmd === 'keep' ? 'kept permanently' : 'due on ' + value} (recorded on ${head.slice(0, 7)})`);
      return 0;
    }
    case 'init':
      return require('./lib/init').run(cwd, { agentIds: agentIds.length ? agentIds : ['bob'] });
    default:
      if (!cmd) { process.stdout.write(USAGE); return 0; }
      process.stderr.write(`Unknown command: ${cmd}\nRun whyline --help for usage.\n`);
      return 1;
  }
}

function printWhy(file, line, r) {
  if (!r.found) { console.log(`${file}:${line}: ${r.reason}`); return; }
  if (r.origin === 'human') { console.log(`${file}:${line}\norigin   human (${r.author || 'unknown'}, commit ${r.commit.slice(0, 7)})`); return; }
  console.log(`${file}:${line}`);
  console.log(`origin   ${r.origin} (${r.agent || 'agent'}) · session ${String(r.session).slice(0, 8)} · ${r.author || '?'} · ${r.ts ? r.ts.slice(0, 10) : '?'}${r.cost != null ? ` · ${r.cost} Bobcoin` : ''}`);
  if (r.prompt) console.log(`prompt   "${r.prompt}"`);
  if (r.siblings.length) console.log(`siblings ${r.siblings.join(' · ')}`);
  if (r.item) console.log(`item     ${r.item.id} ${r.item.kind} · ${r.item.status} · ${JSON.stringify(r.item.condition)} · "${r.item.reason}"`);
  console.log(`commit   ${r.commit.slice(0, 7)}`);
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { main };
