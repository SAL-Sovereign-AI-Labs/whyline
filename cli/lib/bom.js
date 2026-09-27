'use strict';
// Bill of materials: AI lines, reviewed, tested, items, cost over a commit range.
const git = require('./git');
const lenses = require('./lenses');

// Agent config folders (.bob/ and the like) are Whyline's own install, not the release: left out of every count.
const CONFIG_DIRS = require('./agents').all().map(a => a.configDir.replace(/\/$/, ''));
const isConfig = file => CONFIG_DIRS.some(d => file === d || file.startsWith(d + '/'));

function resolveRange(cwd, range) {
  // undefined => whole history (no tag): range is null, diff from empty tree, commits via rev-list HEAD
  if (range === undefined) {
    const emptyTree = git.tryGit(['hash-object', '-t', 'tree', '/dev/null'], { cwd });
    return { displayRange: null, treeA: emptyTree, treeB: 'HEAD', revListArgs: ['HEAD'] };
  }
  // single rev (no '..') => rev..HEAD
  const dotdot = range.indexOf('..');
  let rawA, rawB;
  if (dotdot === -1) {
    rawA = range;
    rawB = 'HEAD';
  } else {
    rawA = range.slice(0, dotdot);
    rawB = range.slice(dotdot + 2);
  }
  for (const rev of [rawA, rawB]) {
    if (!rev || rev.startsWith('.')) throw new Error(`range must look like A..B or A (meaning A..HEAD); got "${range}"`);
    const ok = git.tryGit(['rev-parse', '--verify', '--quiet', rev + '^{commit}'], { cwd });
    if (!ok) throw new Error(`unknown revision ${rev} (use a tag or commit from git log, e.g. v1.0..HEAD)`);
  }
  const treeA = git.tryGit(['rev-parse', rawA + '^{commit}'], { cwd });
  const treeB = git.tryGit(['rev-parse', rawB + '^{commit}'], { cwd });
  return { displayRange: `${rawA}..${rawB}`, treeA, treeB, revListArgs: [treeA + '..' + treeB] };
}

// Added lines summed over every commit in the range (not the net diff), so it is on the same basis as AI lines,
// which are counted when they were committed. A file written by Bob and deleted by a human later counts in both.
// Pathspecs are root-anchored (":/") so the numbers do not depend on the directory the command runs from.
function linesChanged(cwd, revListArgs) {
  const out = git.tryGit(['log', '--numstat', '--format=', '--no-renames', ...revListArgs, '--', ':/', ...CONFIG_DIRS.map(d => `:(exclude,top)${d}`)], { cwd }) || '';
  let total = 0;
  for (const line of out.split('\n').filter(Boolean)) {
    const parts = line.split('\t');
    if (parts[0] === '-') continue; // binary file
    const n = parseInt(parts[0], 10);
    if (!isNaN(n)) total += n;
  }
  return total;
}

function revSet(cwd, revListArgs) {
  const out = git.tryGit(['rev-list', ...revListArgs], { cwd }) || '';
  return new Set(out.split('\n').filter(Boolean));
}

function run(cwd, range) {
  const resolved = resolveRange(cwd, range);
  const { displayRange, treeA, treeB, revListArgs } = resolved;

  const commits = revSet(cwd, revListArgs);
  const changed = linesChanged(cwd, revListArgs);

  const idx = lenses.index(cwd);

  // AI lines: ranges whose commit is inside the rev range
  let aiTotal = 0;
  const byAgent = {};
  let reviewedLines = 0;
  const sessionIds = new Set();

  for (const r of idx.ranges) {
    if (!commits.has(r.commit) || isConfig(r.file)) continue;
    const lineCount = r.lines[1] - r.lines[0] + 1;
    const isAI = r.origin === 'ai' || r.origin === 'ai-edited';
    if (!isAI) continue;
    aiTotal += lineCount;
    const sess = idx.sessions.get(r.session);
    const agent = (sess && sess.agent) || 'unknown';
    byAgent[agent] = (byAgent[agent] || 0) + lineCount;
    sessionIds.add(r.session);
  }

  // reviewed = AI-written lines a human has edited or removed since (at commit time: ai-edited; later: no longer
  // blamed unchanged to their AI commit). This is exactly the complement of `whyline unreviewed` for the range.
  const unreviewedByCommit = require('./review').unreviewedByCommit(cwd, idx);
  let unreviewedLines = 0;
  for (const [commit, n] of unreviewedByCommit) if (commits.has(commit)) unreviewedLines += n;
  reviewedLines = Math.max(0, aiTotal - unreviewedLines);
  const reviewedPercent = aiTotal > 0 ? Math.round(reviewedLines / aiTotal * 100) : null;

  // Items: from check(), only those whose commit is in range
  const checkResult = lenses.check(cwd);
  const allItems = [...checkResult.due, ...checkResult.active, ...checkResult.other];
  const itemCounts = { active: 0, due: 0, kept: 0, removed: 0 };
  for (const it of allItems) {
    if (!commits.has(it.commit)) continue;
    const state = it.state;
    if (state === 'active') itemCounts.active++;
    else if (state === 'due') itemCounts.due++;
    else if (state === 'kept') itemCounts.kept++;
    else if (state === 'removed') itemCounts.removed++;
  }

  // Cost: from sessions of the counted ranges
  const sessCount = sessionIds.size;
  let costSum = null;
  let sessionsWithCost = 0;
  for (const id of sessionIds) {
    const sess = idx.sessions.get(id);
    if (sess && sess.cost != null) {
      costSum = (costSum || 0) + sess.cost;
      sessionsWithCost++;
    }
  }

  if (costSum !== null) costSum = Math.round(costSum * 1000) / 1000; // 0.1 + 0.2 must print 0.3

  const missing = ['coverage'];
  if (sessionsWithCost < sessCount) missing.push('cost');

  // No notes at all: AI lines, review and items are unknown, not zero (the hooks never recorded anything here).
  if (!idx.notes.length) {
    return { range: displayRange, linesChanged: changed, ai: { total: null, byAgent: {} }, reviewed: { lines: null, percent: null },
      tested: { lines: null, percent: null }, items: { active: null, due: null, kept: null, removed: null },
      cost: { sum: null, sessionsWithCost: 0, sessions: 0 }, missing: ['notes', 'coverage', 'cost'] };
  }

  return {
    range: displayRange,
    linesChanged: changed,
    ai: { total: aiTotal, byAgent },
    reviewed: { lines: reviewedLines, percent: reviewedPercent, unreviewedLines },
    tested: { lines: null, percent: null },
    items: itemCounts,
    cost: { sum: costSum, sessionsWithCost, sessions: sessCount },
    missing,
  };
}

function format(r) {
  const title = r.range ? `AI report for ${r.range}` : 'AI report for all history';
  const nd = v => (v == null ? 'no data' : String(v));
  const aiPct = r.ai.total != null && r.linesChanged > 0 ? Math.round(r.ai.total / r.linesChanged * 100) : null;
  const aiCell = nd(r.ai.total) + (aiPct !== null ? ` (${aiPct}%)` : '');
  const revCell = r.reviewed.lines == null ? 'no data' : r.reviewed.percent !== null ? `${r.reviewed.lines} (${r.reviewed.percent}%)` : `${r.reviewed.lines} (no data)`;
  const testedCell = 'no data';
  const chats = `${r.cost.sessionsWithCost} of ${r.cost.sessions} Bob chats had a cost`;
  const costCell = r.cost.sum !== null ? `${r.cost.sum} Bob usage credits (${chats})` : `no data (${chats})`;
  const rows = [
    ['lines changed', String(r.linesChanged)],
    ['written by AI', aiCell],
    ['AI lines a person changed since', revCell],
    ['covered by tests', testedCell],
    ['temporary code waiting', nd(r.items.active)],
    ['temporary code ready to delete', nd(r.items.due)],
    ['temporary code kept on purpose', nd(r.items.kept)],
    ['temporary code deleted', nd(r.items.removed)],
    ['cost', costCell],
  ];
  const colW = Math.max(...rows.map(([k]) => k.length));
  const lines = [title, '-'.repeat(Math.min(60, title.length + 4))];
  for (const [k, v] of rows) {
    lines.push(`${k.padEnd(colW)}  ${v}`);
  }
  if ((r.missing || []).includes('notes')) lines.push('', 'Nothing saved in your git history yet. Commit something Bob wrote, then run whyline bom again.');
  return lines.join('\n');
}

module.exports = { run, format };
