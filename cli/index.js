#!/usr/bin/env node
'use strict';
// whyline: provenance for AI-written code. Commands never throw at the agent: hook commands always exit 0.
const fs = require('node:fs');

const USAGE = `whyline <command> [--json]

  init [--agent bob]        install the agent's hooks (.bob/) and git hooks in this repo
  capture [--agent bob]     hook: read a hook payload on stdin, record the write (--dump or WHYLINE_DUMP=1 keeps raw payloads in .git/whyline/raw/)
  session-start             hook: print a one-line summary for Bob's context
  commit                    git post-commit: attach the provenance note to HEAD
  why <file>:<line>         who wrote this line, and why
  check [--json] [--gate]   temporary items and their lifecycle state (--gate: exit 2 when any is due, for hooks and CI)
  unreviewed [--json]       AI lines no human has edited since, per file, with coverage if a report exists
  bom [A..B] [--json]       AI bill of materials for a commit range (default: last tag..HEAD, else all)
  report [--out file]       write the read-only HTML report (.whyline-report.html)
  keep <item> "<reason>"    decision: keep permanently          (due -> kept)
  until <item> <YYYY-MM-DD> change the condition to a date       (stays active)
  watch <item> --symbol X   fix the symbol the reference check searches for
  removed <item>            record a removal done by hand (a commit message naming the item does this automatically)
  seed [--dry-run] [--by-name] first run on an existing repo: record code with TODO remove, FIXME, HACK, temporary or until markers; --by-name also records mock_, compat_, examples/, fixtures/ names

  <item> is a file path (or its last part), a watched symbol, a kind (mock, demo, flag, shim, fixture) when unique,
  or the id shown by check. People name files; ids are for notes and scripts.

Lifecycle:  active --(condition met)--> due --(you decide)--> kept | removed
            active and due are recomputed from the repo on every check; kept and removed are recorded.
  --version, --help

Exit codes: 0 ok, 1 usage or error, 2 only with check --gate when items are due, 3 not a git repository.
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
        const raw = readStdin() || '{}';
        if (args.includes('--dump') || process.env.WHYLINE_DUMP) dumpRaw(cwd, raw);
        const payload = JSON.parse(raw);
        require('./lib/capture').handle(payload, { cwd, agent: agentIds[0] });
      } catch (e) { session.logError(cwd, `capture: ${e.message}`); debug('capture', e.stack || ''); }
      return 0;
    }
    case 'session-start': {
      // stdout is injected into Bob's context. One line, actionable, only when there is something to act on.
      try {
        const lenses = require('./lib/lenses');
        const r = lenses.check(cwd);
        const parts = [];
        if (r.due.length) parts.push(`${r.due.length} temporary item(s) due for removal: ${r.due.map(i => `${i.file} (${i.id})`).join(', ')}. To act, say "remove ${r.due[0].file.split('/').pop()}" and the whyline-remove skill will guide the removal`);
        const u = lenses.unreviewed(cwd);
        if (u.totals.aiLines) parts.push(`${u.totals.aiLines} AI-written line(s) in ${u.totals.files} file(s) have had no human edit since (run: whyline unreviewed)`);
        if (parts.length) process.stdout.write(`whyline: ${parts.join('. ')}\n`);
      } catch { /* silent by design */ }
      return 0;
    }
    case 'commit': {
      try {
        const r = require('./lib/commit').run(cwd);
        if (r.removed && r.removed.length) process.stderr.write(`whyline: recorded removed: ${r.removed.join(', ')}\n`);
        if (r.note) process.stderr.write(`whyline: note attached to ${r.commit.slice(0, 7)} (${r.note.ranges.length} range(s), ${r.note.items.length} item(s))\n`);
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
      const gate = args.includes('--gate');
      const r = require('./lib/lenses').check(cwd);
      const exit = gate && r.due.length ? 2 : 0;
      if (json) { console.log(JSON.stringify(r, null, 2)); return exit; }
      if (!r.due.length && !r.active.length && !r.other.length) { console.log('no temporary items yet (commit something Bob wrote, then check again)'); return 0; }
      printCheck(r);
      return exit;
    }
    case 'unreviewed': {
      const r = require('./lib/lenses').unreviewed(cwd);
      if (json) { console.log(JSON.stringify(r, null, 2)); return 0; }
      if (!r.files.length) { console.log('no AI-written lines recorded yet (commit something Bob wrote, then run again)'); return 0; }
      console.log('file'.padEnd(44) + 'ai lines  edited  coverage');
      for (const f of r.files) console.log(`${f.file.padEnd(44)}${String(f.aiLines).padStart(8)}  ${String(f.editedRanges).padStart(6)}  ${f.coverage == null ? 'no data' : f.coverage + '%'}`);
      console.log(`${r.totals.aiLines} unreviewed AI lines in ${r.totals.files} file(s)${r.totals.coverageSource ? `, coverage from ${r.totals.coverageSource}` : ', no coverage report found (coverage.xml or lcov.info)'}`);
      return 0;
    }
    case 'bom': {
      // optional module: cli/lib/bom.js exporting bom(cwd, range) -> JSON and format(result) -> text
      const mod = optional('./lib/bom');
      if (!mod) { process.stderr.write('bom is not built yet (cli/lib/bom.js missing)\n'); return 1; }
      const range = args[0] || defaultRange(cwd);
      const r = (mod.bom || mod.run)(cwd, range);
      console.log(json ? JSON.stringify(r, null, 2) : mod.format(r));
      return 0;
    }
    case 'report': {
      // optional module: cli/lib/report.js exporting render(data) -> HTML string. The router gathers the data.
      const mod = optional('./lib/report');
      if (!mod) { process.stderr.write('report is not built yet (cli/lib/report.js missing)\n'); return 1; }
      const lenses = require('./lib/lenses');
      const git = require('./lib/git');
      const root = git.repoRoot(cwd);
      if (!root) { process.stderr.write('not a git repository\n'); return 3; }
      const bomMod = optional('./lib/bom');
      const range = defaultRange(cwd);
      const idx = lenses.index(cwd);
      const data = {
        generatedAt: new Date().toISOString(),
        repo: require('node:path').basename(root),
        head: git.head(cwd),
        check: lenses.check(cwd),
        unreviewed: lenses.unreviewed(cwd),
        bom: bomMod ? (bomMod.bom || bomMod.run)(cwd, range) : null,
        why: mod.collect ? mod.collect(cwd, idx) : null,
        sessions: [...idx.sessions.values()],
        ranges: idx.ranges,
        notes: idx.notes.length,
      };
      const outIdx = args.indexOf('--out');
      const out = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : require('node:path').join(root, '.whyline-report.html');
      fs.writeFileSync(out, mod.render(data));
      console.log(`report written: ${out} (${data.notes} note(s), ${data.ranges.length} range(s))`);
      return 0;
    }
    case 'keep':
    case 'until':
    case 'watch':
    case 'removed': {
      const id = args[0], value = cmd === 'removed' ? (args[1] || 'removed by hand') : (args[1] === '--symbol' ? args[2] : args[1]);
      const usage = { keep: '"<reason>"', until: '<YYYY-MM-DD>', watch: '--symbol <Name>', removed: '' }[cmd];
      if (!id || !value) { process.stderr.write(`usage: whyline ${cmd} <file|symbol|kind|id> ${usage}\n`); return 1; }
      if (cmd === 'until' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) { process.stderr.write('until: date must be YYYY-MM-DD\n'); return 1; }
      const lenses = require('./lib/lenses');
      const change = cmd === 'keep' ? { status: 'kept', reason: value }
        : cmd === 'until' ? { status: 'active', condition: { type: 'date', on: value } }
        : cmd === 'watch' ? { status: 'active', condition: { type: 'no_references', symbol: value } }
        : { status: 'removed', reason: value };
      const item = lenses.resolveItem(cwd, id);
      const head = lenses.recordItemChange(cwd, item.id, change);
      const said = { keep: 'kept permanently', until: `due on ${value}`, watch: `now watching symbol ${value}`, removed: 'recorded as removed' }[cmd];
      console.log(`${item.file} (${item.id}): ${said} (recorded on ${head.slice(0, 7)})`);
      return 0;
    }
    case 'seed': {
      const r = require('./lib/seed').run(cwd, { dryRun: args.includes('--dry-run'), byName: args.includes('--by-name') });
      if (r.error) { process.stderr.write(`seed: ${r.error}\n`); return 3; }
      if (json) { console.log(JSON.stringify(r, null, 2)); return 0; }
      for (const it of r.items) console.log(`  ${it.id}  ${it.kind.padEnd(8)} ${it.file.padEnd(40)} since ${it.created}  "${it.reason}"`);
      if (r.items.length) console.log(`${r.items.length} item(s) ${args.includes('--dry-run') ? 'found (dry run, nothing recorded)' : 'recorded on ' + r.head.slice(0, 7)}. Next: whyline check`);
      else console.log(`nothing new to seed from comment markers (${r.skipped} file(s) already tracked)`);
      if (r.byNameOnly.length) console.log(`${r.byNameOnly.length} file(s) look temporary by name only (mock_, compat_, examples/, fixtures/): ${r.byNameOnly.slice(0, 5).join(', ')}${r.byNameOnly.length > 5 ? ', ...' : ''}. Add --by-name to record them.`);
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

// Keep raw hook payloads for fixtures (one file per event). Never throws.
function dumpRaw(cwd, raw) {
  try {
    const dir = require('./lib/session').dir(cwd);
    if (!dir) return;
    const d = require('node:path').join(dir, 'raw');
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(require('node:path').join(d, `${Date.now()}-${process.pid}.json`), raw);
  } catch { /* fixtures are a convenience */ }
}

// Modules owned by the other developer may not exist yet on this branch.
function optional(mod) { try { return require(mod); } catch (e) { if (e.code === 'MODULE_NOT_FOUND' && String(e.message).includes(mod.replace('./', ''))) return null; throw e; } }

// Last tag to HEAD when a tag exists, else undefined, which bom.js treats as the whole history.
function defaultRange(cwd) {
  const git = require('./lib/git');
  const tag = git.tryGit(['describe', '--tags', '--abbrev=0'], { cwd });
  return tag ? `${tag}..HEAD` : undefined;
}

function printCheck(r) {
  const col = (s, n) => String(s == null ? '' : s).padEnd(n).slice(0, n);
  const row = it => `  ${col(it.id, 9)} ${col(it.kind, 8)} ${col(it.file, 38)} ${col(it.evidence ? it.evidence.summary : (it.reason || ''), 60)}`;
  const section = (title, list) => { if (!list.length) return; console.log(`${title} (${list.length})`); console.log(`  ${col('id', 9)} ${col('kind', 8)} ${col('file', 38)} ${col('evidence', 60)}`); list.forEach(it => console.log(row(it))); };
  section('DUE for removal', r.due);
  section('ACTIVE', r.active);
  section('DECIDED', r.other.map(it => ({ ...it, evidence: { summary: `${it.state}${it.reason ? ': ' + it.reason : ''}` } })));
  const c = r.counts;
  const next = r.due.length ? `Next: tell Bob "remove ${r.due[0].file.split('/').pop()}", or whyline keep <file> "<reason>", or whyline why <file>:<line>` : 'Nothing is due.';
  console.log(`${c.active} active, ${c.due} due, ${c.kept} kept, ${c.removed} removed. ${next}`);
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
