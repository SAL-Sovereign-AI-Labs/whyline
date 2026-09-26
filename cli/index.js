#!/usr/bin/env node
'use strict';
// whyline: provenance for AI-written code. Commands never throw at the agent: hook commands always exit 0.
const fs = require('node:fs');

const USAGE = `whyline <command>

  init                      install Bob hooks (.bob/) and git hooks in this repo
  capture                   hook: read a Bob/Claude payload on stdin, record the write
  session-start             hook: print a one-line summary for Bob's context
  commit                    git post-commit: attach the provenance note to HEAD
  why <file>:<line>         who wrote this line, and why
  check [--json]            temporary items that are due (exit 2 when any)
  keep <id> "<reason>"      mark an item permanent
  until <id> <YYYY-MM-DD>   change an item's condition to a date
`;

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const cwd = process.cwd();
  const json = rest.includes('--json');
  const args = rest.filter(a => a !== '--json');
  switch (cmd) {
    case 'capture': {
      const session = require('./lib/session');
      try {
        const payload = JSON.parse(readStdin() || '{}');
        require('./lib/capture').handle(payload, { cwd });
      } catch (e) { session.logError(cwd, `capture: ${e.message}`); }
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
      return require('./lib/init').run(cwd, { claude: args.includes('--claude') });
    default:
      process.stdout.write(USAGE);
      return cmd ? 1 : 0;
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
