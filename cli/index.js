#!/usr/bin/env node
'use strict';
// whyline: provenance for AI-written code. Commands never throw at the agent: hook commands always exit 0.
const fs = require('node:fs');

const USAGE = `whyline: know why your AI wrote every line, and clean up what it left behind.

Usage: whyline <command> [--json]

Set up
  init [--agent bob]           set Whyline up in this repo: small scripts IBM Bob runs automatically (in .bob/) and git hooks
  seed [--dry-run] [--by-name] first run on an older repo: find temporary code that is already there (comments like
                               TODO remove, FIXME, HACK, "until X lands"); --by-name also takes mock_, compat_, examples/ and fixtures/ files

Ask
  why <file>:<line>            who wrote this line, and why: the request you gave Bob, and the other files it changed
  check [--gate]               temporary code: what is ready to delete and what is still waiting
                               (--gate: fail the pull request check, exit 2, while anything is ready to delete)
  unreviewed                   AI code no person has changed since, per file, with test coverage if a report exists
  bom [A..B]                   AI report for a release (default: last tag..HEAD, or all history when there is no tag)
  report [--out file]          write the read-only HTML dashboard (.whyline-report.html)

Decide about temporary code
  keep <file> "<reason>"       keep it on purpose, so it stops showing as ready to delete
  until <file> <YYYY-MM-DD>    make it ready to delete after a date instead
  watch <file> --symbol X      change the class or function name Whyline checks is still used
  removed <file>               say you deleted it by hand (a commit message like "remove <file>" does this for you)

Check Whyline itself
  selftest                     built-in self check: plants a passing and a failing case for every check in a throwaway repo

Run for you automatically by Bob and git (you do not type these)
  capture [--agent bob]        saves each request you send and each file Bob edits (--dump or WHYLINE_DUMP=1 keeps the raw input in .git/whyline/raw/)
  session-start                prints one line for Bob when a Bob chat starts
  commit                       after each git commit: saves the request behind Bob's code in your git history

  <file> is the temporary code's file path (or just its file name). Its class or function name, or its kind
  (mock, demo, flag, shim, fixture) when only one has that kind, work too. The id shown by check (like L-12d3fa) works too.

Temporary code is waiting, then ready to delete once nothing uses it or its date passes.
Then you decide: keep it on purpose, or delete it. Whyline works out the first two on every check.

Every read command takes --json for scripts. Also: --version, --help.
Exit codes: 0 ok, 1 wrong usage or an error, 2 only with check --gate while something is ready to delete, 3 not a git repository.
Env: WHYLINE_DEBUG=1 prints stack traces to stderr. WHYLINE_BOB_DB points to a different Bob database file.
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
  if (['why', 'check', 'unreviewed', 'bom', 'report', 'keep', 'until', 'watch', 'removed', 'seed'].includes(cmd) && !require('./lib/git').repoRoot(cwd)) {
    process.stderr.write('whyline: this folder is not a git repository. Go to your project folder (or run git init first), then try again.\n'); return 3;
  }
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
        if (r.due.length) parts.push(`${plural(r.due.length, 'piece of temporary code is', 'pieces of temporary code are')} ready to delete: ${r.due.map(i => `${i.file} (${i.evidence.summary})`).join(', ')}. To delete it, the user can say "remove ${r.due[0].file.split('/').pop()}" and the whyline-remove skill shows the proof and asks before changing anything`);
        const u = lenses.unreviewed(cwd);
        if (u.totals.aiLines) parts.push(`${plural(u.totals.aiLines, 'AI-written line')} in ${plural(u.totals.files, 'file')} no person has changed since (to see them: whyline unreviewed)`);
        if (parts.length) process.stdout.write(`whyline: ${parts.join('. ')}.\n`);
      } catch { /* silent by design */ }
      return 0;
    }
    case 'commit': {
      try {
        const r = require('./lib/commit').run(cwd);
        if (r.removed && r.removed.length) {
          const { items } = require('./lib/lenses').index(cwd);
          process.stderr.write(`whyline: marked as deleted: ${r.removed.map(id => (items.get(id) || { file: id }).file).join(', ')}\n`);
        }
        if (r.note) process.stderr.write(`whyline: saved the request behind Bob's code in your git history, on commit ${r.commit.slice(0, 7)} (${plural(r.note.ranges.length, 'block')} of AI code, ${plural(r.note.items.length, 'piece')} of temporary code)\n`);
      } catch (e) { require('./lib/session').logError(cwd, `commit: ${e.message}`); }
      return 0;
    }
    case 'why': {
      const m = (args[0] || '').match(/^(.+):(\d+)$/);
      if (!m) { process.stderr.write('usage: whyline why <file>:<line>, for example whyline why src/app.py:12\n'); return 1; }
      const r = require('./lib/lenses').why(cwd, m[1], +m[2]);
      if (json) { console.log(JSON.stringify(r, null, 2)); return 0; }
      printWhy(cwd, m[1], +m[2], r);
      return 0;
    }
    case 'selftest': {
      const r = require('./lib/selftest').run();
      if (json) { console.log(JSON.stringify(r, null, 2)); return r.proven ? 0 : 1; }
      console.log('Built-in self check: for every check, a case that must pass and a case that must fail, in a throwaway repo.');
      for (const t of r.results) console.log(`${t.ok ? 'PASS' : 'FAIL'}  ${t.name}${t.detail ? ` (${t.detail})` : ''}`);
      console.log(r.proven ? `${r.passed} of ${r.total} checks told the two cases apart. Whyline works on this machine.`
        : `${r.passed} of ${r.total} checks told the two cases apart. Something is wrong: see the FAIL lines above, and run with WHYLINE_DEBUG=1 for details.`);
      return r.proven ? 0 : 1;
    }
    case 'check': {
      const gate = args.includes('--gate');
      const r = require('./lib/lenses').check(cwd);
      const exit = gate && r.due.length ? 2 : 0;
      if (json) { console.log(JSON.stringify(r, null, 2)); return exit; }
      if (!r.due.length && !r.active.length && !r.other.length) { console.log('No temporary code yet. Commit something Bob wrote, then run whyline check again. On an older repo, run whyline seed first.'); return 0; }
      printCheck(r);
      if (gate && process.env.GITHUB_ACTIONS === 'true') annotate(r.due);
      return exit;
    }
    case 'unreviewed': {
      const r = require('./lib/lenses').unreviewed(cwd);
      if (json) { console.log(JSON.stringify(r, null, 2)); return 0; }
      if (!r.files.length) { console.log('No AI-written lines saved yet. Commit something Bob wrote, then run whyline unreviewed again.'); return 0; }
      console.log('AI CODE NO PERSON HAS CHANGED SINCE');
      console.log('  ' + 'file'.padEnd(44) + 'AI lines  blocks a person changed  test coverage');
      for (const f of r.files) console.log(`  ${f.file.padEnd(44)}${String(f.aiLines).padStart(8)}  ${String(f.editedRanges).padStart(22)}  ${f.coverage == null ? 'no data' : f.coverage + '%'}`);
      console.log(`${plural(r.totals.aiLines, 'AI-written line')} in ${plural(r.totals.files, 'file')} no person has changed since Bob wrote them.${r.totals.coverageSource ? ` Test coverage from ${r.totals.coverageSource}.` : ' No test coverage report found (coverage.xml or lcov.info), so coverage shows no data.'}`);
      console.log('Next: read the top file first, or run whyline why <file>:<line> to see the request behind a line.');
      return 0;
    }
    case 'bom': {
      // optional module: cli/lib/bom.js exporting bom(cwd, range) -> JSON and format(result) -> text
      const mod = optional('./lib/bom');
      if (!mod) { process.stderr.write('bom is not built yet (cli/lib/bom.js missing). Reinstall whyline.\n'); return 1; }
      const range = args[0] || defaultRange(cwd);
      const r = (mod.bom || mod.run)(cwd, range);
      console.log(json ? JSON.stringify(r, null, 2) : mod.format(r));
      return 0;
    }
    case 'report': {
      // optional module: cli/lib/report.js exporting render(data) -> HTML string. The router gathers the data.
      const mod = optional('./lib/report');
      if (!mod) { process.stderr.write('report is not built yet (cli/lib/report.js missing). Reinstall whyline.\n'); return 1; }
      const lenses = require('./lib/lenses');
      const git = require('./lib/git');
      const root = git.repoRoot(cwd);
      if (!root) { process.stderr.write('whyline: this folder is not a git repository. Go to your project folder, then try again.\n'); return 3; }
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
      console.log(`Dashboard written: ${out} (from ${plural(data.notes, 'commit')} with Whyline history, ${plural(data.ranges.length, 'block')} of AI code). Open it in your browser.`);
      return 0;
    }
    case 'keep':
    case 'until':
    case 'watch':
    case 'removed': {
      const id = args[0], value = cmd === 'removed' ? (args[1] || 'removed by hand') : (args[1] === '--symbol' ? args[2] : args[1]);
      const usage = { keep: ' "<reason>"', until: ' <YYYY-MM-DD>', watch: ' --symbol <class or function name>', removed: '' }[cmd];
      if (!id || !value) { process.stderr.write(`usage: whyline ${cmd} <file>${usage}  (run whyline check to see the files)\n`); return 1; }
      if (cmd === 'until' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(Date.parse(value + 'T00:00:00Z')) || new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value)) { process.stderr.write('until: give a real date as YYYY-MM-DD, for example 2026-12-01\n'); return 1; }
      const lenses = require('./lib/lenses');
      const change = cmd === 'keep' ? { status: 'kept', reason: value }
        : cmd === 'until' ? { status: 'active', condition: { type: 'date', on: value } }
        : cmd === 'watch' ? { status: 'active', condition: { type: 'no_references', symbol: value } }
        : { status: 'removed', reason: value };
      const item = lenses.resolveItem(cwd, id);
      const head = lenses.recordItemChange(cwd, item.id, change);
      const said = { keep: 'kept on purpose', until: `ready to delete after ${value}`, watch: `waits until nothing uses ${value} any more`, removed: 'marked as deleted' }[cmd];
      console.log(`${item.file}: ${said}. Saved in your git history on commit ${head.slice(0, 7)}. Run whyline check to see the list.`);
      return 0;
    }
    case 'seed': {
      const r = require('./lib/seed').run(cwd, { dryRun: args.includes('--dry-run'), byName: args.includes('--by-name') });
      if (r.error) { process.stderr.write(`seed: ${r.error}\n`); return 3; }
      if (json) { console.log(JSON.stringify(r, null, 2)); return 0; }
      for (const it of r.items) console.log(`  ${it.file.padEnd(40)} ${it.kind.padEnd(8)} since ${it.created}  "${it.reason}"  ${it.id}`);
      if (r.items.length) console.log(`Found ${plural(r.items.length, 'piece')} of temporary code${args.includes('--dry-run') ? ' (dry run, nothing saved)' : `, saved in your git history on commit ${r.head.slice(0, 7)}`}. Next: run whyline check to see what is ready to delete.`);
      else console.log(`No new temporary code found in comments (${plural(r.skipped, 'file')} already tracked).`);
      if (r.byNameOnly.length) console.log(`${plural(r.byNameOnly.length, 'file')} only look temporary by name (mock_, compat_, examples/, fixtures/): ${r.byNameOnly.slice(0, 5).join(', ')}${r.byNameOnly.length > 5 ? ', ...' : ''}. To track them too, run whyline seed --by-name.`);
      return 0;
    }
    case 'init':
      return require('./lib/init').run(cwd, { agentIds: agentIds.length ? agentIds : ['bob'] });
    default:
      if (!cmd) { process.stdout.write(USAGE); return 0; }
      process.stderr.write(`whyline: unknown command "${cmd}". Run whyline --help to see the commands.\n`);
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

// "1 file", "2 files". Plural defaults to singular + "s".
function plural(n, one, many = one + 's') { return `${n} ${n === 1 ? one : many}`; }

const STATE_WORDS = { active: 'waiting', due: 'ready to delete', kept: 'kept on purpose', removed: 'deleted' };

function printCheck(r) {
  const col = (s, n) => String(s == null ? '' : s).padEnd(n).slice(0, n);
  const head = `  ${col('file', 38)} ${col('kind', 8)} ${col('why', 60)} id`;
  const row = it => `  ${col(it.file, 38)} ${col(it.kind, 8)} ${col(it.evidence ? it.evidence.summary : (it.reason || ''), 60)} ${it.id}`;
  const section = (title, list) => { if (!list.length) return; console.log(`${title} (${list.length})`); console.log(head); list.forEach(it => console.log(row(it))); console.log(''); };
  section('READY TO DELETE', r.due);
  section('WAITING', r.active);
  section('KEPT OR DELETED', r.other.map(it => ({ ...it, evidence: { summary: `${STATE_WORDS[it.state] || it.state}${it.reason ? ': ' + it.reason : ''}` } })));
  const c = r.counts;
  const next = r.due.length
    ? `Next: tell Bob "remove ${r.due[0].file.split('/').pop()}" and it shows the proof and asks before deleting. To keep it instead: whyline keep ${r.due[0].file.split('/').pop()} "<reason>".`
    : 'Nothing is ready to delete.';
  console.log(`${c.due} ready to delete, ${c.active} waiting, ${c.kept} kept on purpose, ${c.removed} deleted. ${next}`);
}

// Condition in plain words: when this temporary code becomes ready to delete.
function expiryText(cond) {
  const c = cond || {};
  if (c.type === 'date') return `after ${c.on}`;
  if (c.type === 'no_references') return `when nothing uses ${c.symbol || 'it'} any more`;
  return 'no expiry set';
}

function printWhy(cwd, file, line, r) {
  const row = (label, value) => console.log(`${label.padEnd(15)}${value}`);
  if (!r.found) { console.log(`${file}:${line}: ${r.reason}`); return; }
  console.log(`${file}:${line}`);
  if (r.origin === 'human') {
    row('written by', `a person (${r.author || 'name unknown'})`);
    row('commit', r.commit.slice(0, 7));
    console.log('Whyline saved no request for this line: Bob did not write it.');
    return;
  }
  const adapter = require('./lib/agents').byId(r.agent);
  const agentName = adapter ? adapter.name : (r.agent || 'an AI assistant');
  row('written by', r.origin === 'ai-edited' ? `AI (${agentName}), then changed by a person` : `AI (${agentName})`);
  row('asked by', `${r.author || 'name unknown'}, on ${r.ts ? r.ts.slice(0, 10) : 'an unknown date'}, in Bob chat ${String(r.session).slice(0, 8)}${r.cost != null ? ` (cost ${r.cost} Bob usage credits)` : ''}`);
  row('request', r.prompt ? `"${r.prompt}"` : 'no data');
  if (r.siblings.length) { console.log('other files this request changed'); for (const s of r.siblings) console.log(`${''.padEnd(15)}${s.replace(/:(\d+)-\1$/, ':$1')}`); }
  let due = false;
  if (r.item) {
    let state;
    if (r.item.status === 'active') {
      const e = require('./lib/lenses').evaluate(cwd, r.item, new Date());
      due = e.due;
      state = `${due ? 'ready to delete' : 'waiting'}: ${e.evidence.summary}`;
    } else state = `${STATE_WORDS[r.item.status] || r.item.status}${r.item.status === 'kept' && r.item.reason ? ': ' + r.item.reason : ''}`;
    row('temporary code', `${r.item.kind}, ${state} (id ${r.item.id})`);
    if (r.item.status === 'active' && !due && (r.item.condition || {}).type !== 'date') row('can go', expiryText(r.item.condition));
  }
  row('commit', r.commit.slice(0, 7));
  if (due) console.log(`Next: tell Bob "remove ${r.item.file.split('/').pop()}" and it shows the proof and asks before deleting.`);
}

// GitHub Actions annotations for due items (check --gate inside Actions only): the error shows on the file in the pull request.
function annotate(due) {
  const esc = (v, prop) => String(v).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(prop ? /[:,]/g : /$^/, c => (c === ':' ? '%3A' : '%2C'));
  for (const it of due) {
    const line = (it.lines && it.lines[0] && it.lines[0][0]) || 1;
    const why = it.reason ? `Saved as temporary code: "${it.reason}". ` : '';
    const msg = `${why}${it.evidence && it.evidence.summary ? 'Ready to delete: ' + it.evidence.summary + '. ' : ''}Delete it with Bob (say "remove ${it.file}"), or keep it on purpose: whyline keep ${it.file} "<reason>".`;
    console.log(`::error file=${esc(it.file, true)},line=${line},title=${esc(`whyline: temporary ${it.kind} is ready to delete`, true)}::${esc(msg)}`);
  }
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { main };
