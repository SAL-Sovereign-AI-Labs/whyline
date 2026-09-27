import type { Figure, FigRow } from '../src';

// "Whyline 2 · Across the team": the record travels with the code (git notes pushed and fetched by the
// git hooks), CI turns the removal condition into a gate (whyline.yml on the demo shop: PR #1 green,
// PR #2 red), the live dashboard answers every role (pages.yml in the whyline repo rebuilds the demo from
// recorded sessions), and a proposed Team tier rolls the hooks out with Bob's EnforcedHooks group policy.
// Nothing in the "team tier" tab is built yet: it is labelled proposed throughout.

const CODE: FigRow = { tag: 'code', tone: 'gray', text: 'src/payments/mock_gateway.py', mono: true };
const NOTES: FigRow = { tag: 'notes', tone: 'blue', text: 'Git notes', meta: 'refs/notes/whyline' };
const DUE_MOCK: FigRow = { tag: 'due', tone: 'orange', text: 'L-12d3fa mock', meta: 'no references outside the file and its tests' };
const DUE_DEMO: FigRow = { tag: 'due', tone: 'orange', text: 'L-0b3a47 demo', meta: 'examples/demo_orders.py' };
const MERGE: FigRow = { tag: 'git', tone: 'gray', text: 'git merge payments-v2', mono: true };

const step = (text: string, mark?: string): FigRow => ({ text, mono: true, mark });
const CI_STEPS = ['checkout · full history', 'git fetch notes', 'npm i -g github:…/whyline', 'whyline check --gate'];
const ci = (done: number, last?: string) =>
  CI_STEPS.map((s, i) => step(s, i < done ? '✓' : i === done && last ? last : undefined));
const PAGES_STEPS = ['rebuild demo from sessions', 'git merge payments-v2', 'whyline report', 'deploy to GitHub Pages'];
const pages = (done: number) => PAGES_STEPS.map((s, i) => step(s, i < done ? '✓' : undefined));

const VIEWS: FigRow[] = [
  { tag: '1', tone: 'gray', text: 'Overview' },
  { tag: '2', tone: 'gray', text: 'Why this line' },
  { tag: '3', tone: 'gray', text: 'Expiry' },
  { tag: '4', tone: 'gray', text: 'Unreviewed' },
  { tag: '5', tone: 'gray', text: 'AI Bill of Materials' },
  { tag: '6', tone: 'gray', text: 'Status' },
];
const BOM: FigRow[] = [
  { tag: 'ai', tone: 'blue', text: '49 of 96 lines AI-written', meta: '51%' },
  { tag: 'bob', tone: 'blue', text: '7 Bob sessions', meta: 'cost: no data (replayed sessions)' },
  { tag: 'review', tone: 'orange', text: '47 lines unreviewed' },
  { tag: 'items', tone: 'orange', text: '2 due · 4 active' },
];
const HOOKS: FigRow[] = [
  { text: 'SessionStart', mono: true, mark: 'enforced' },
  { text: 'UserPromptSubmit', mono: true, mark: 'enforced' },
  { text: 'PostToolUse', mono: true, mark: 'enforced' },
  { text: 'PreToolUse guard', mono: true, mark: 'enforced' },
  { tag: 'cost', tone: 'green', text: '0 Bobcoins', meta: 'no model call' },
];
const POLICY: FigRow = { tag: 'policy', tone: 'purple', text: 'EnforcedHooks', meta: 'proposed' };

// A beat that shows its `say` long enough to read at the engine's 1.25x base rate.
const read = (words: number) => Math.round(1.25 * (words * 230 + 700));

const props: Figure['props'] = {
  speed: 2200,
  layout: {
    gap: 80,
    align: 'start',
    children: [
      {
        id: 'devs',
        label: 'Developers',
        direction: 'column',
        gap: 40,
        children: [
          { id: 'laptop', label: 'Your repo', sub: 'code + git notes', shape: 'store', width: 230, lines: 2, hint: 'code + git notes' },
          { id: 'mate', label: 'Teammate’s clone', sub: 'git pull', shape: 'store', width: 230, lines: 3, hint: 'same repo, other laptop' },
          { id: 'policy', label: 'Org admin', sub: 'Bob group policy', width: 230, lines: 2, hint: 'proposed Team tier' },
        ],
      },
      {
        id: 'hooks',
        label: 'Hooks',
        direction: 'column',
        gap: 40,
        children: [
          { id: 'prepush', label: 'pre-push', sub: 'git hook · whyline init', width: 200, lines: 1, hint: 'pushes notes with code' },
          { id: 'postmerge', label: 'post-merge', sub: 'git hook · whyline init', width: 200, lines: 3, hint: 'fetches notes, then checks' },
          { id: 'bobs', label: 'Every developer’s Bob', sub: 'Bob hooks · proposed', width: 200, lines: 4, hint: 'hooks on every machine' },
        ],
      },
      {
        id: 'github',
        label: 'GitHub',
        direction: 'column',
        gap: 40,
        children: [
          { id: 'actions', label: 'GitHub Actions', sub: 'whyline.yml · demo shop', width: 220, lines: 4, hint: 'runs on every PR' },
          { id: 'origin', label: 'origin', sub: 'code + git notes', shape: 'store', width: 220, lines: 2, hint: 'the shared remote' },
          { id: 'pages', label: 'Live demo', sub: 'pages.yml · whyline repo', width: 220, lines: 4, hint: 'rebuilds the live demo' },
        ],
      },
      {
        id: 'answers',
        label: 'Answers',
        direction: 'column',
        align: 'start',
        gap: 32,
        children: [
          {
            direction: 'row',
            align: 'start',
            gap: 90,
            children: [
              {
                direction: 'column',
                align: 'center',
                gap: 32,
                children: [
                  { id: 'gate', label: 'anything due?', shape: 'decision' },
                  { id: 'green', label: 'Check passes', sub: 'PR #1 · for reviewers', width: 200, lines: 2, hint: 'PR can merge' },
                ],
              },
              { id: 'red', label: 'Check fails', sub: 'PR #2 · for reviewers', width: 230, lines: 4, hint: 'PR blocked' },
            ],
          },
          {
            direction: 'row',
            align: 'start',
            gap: 90,
            children: [
              {
                direction: 'column',
                gap: 32,
                children: [
                  { id: 'report', label: 'Dashboard', sub: 'for developers', width: 200, lines: 6, hint: 'six views, one HTML page' },
                  { id: 'lead', label: 'Compliance record', sub: 'for the lead · proposed', width: 200, lines: 3, hint: 'one per release (proposed)' },
                ],
              },
              { id: 'bom', label: 'AI bill of materials', sub: 'for the lead', width: 230, lines: 4, hint: 'how much is AI' },
            ],
          },
        ],
      },
    ],
  },
  edges: [
    { id: 'push', from: 'laptop', to: 'prepush', label: 'git push' },
    { id: 'push-notes', from: 'prepush', to: 'origin', label: 'push notes' },
    { id: 'fetch-notes', from: 'origin', to: 'postmerge', label: 'fetch notes' },
    { id: 'pull', from: 'mate', to: 'postmerge', label: 'git pull' },
    { id: 'pr', from: 'origin', to: 'actions', label: 'pull_request' },
    { id: 'check', from: 'actions', to: 'gate' },
    { id: 'yes', from: 'gate', to: 'red', label: 'yes' },
    { id: 'no', from: 'gate', to: 'green', label: 'no' },
    { id: 'deploy', from: 'pages', to: 'report' },
    { id: 'bom', from: 'report', to: 'bom', quiet: true },
    { id: 'enforce', from: 'policy', to: 'bobs', label: 'EnforcedHooks', quiet: true },
    { id: 'release', from: 'report', to: 'lead' },
  ],
  steps: [
    {
      label: 'share',
      flow: [
        {
          show: { laptop: [CODE, NOTES] },
          light: ['laptop'],
          say: 'Whyline’s record lives beside your code as git notes.',
          ms: read(9),
        },
        {
          edges: { edge: 'push', data: 'git push' },
          show: { prepush: [step('push refs/notes/whyline')] },
          say: 'You run git push as usual.',
          ms: read(6),
        },
        {
          edges: { edge: 'push-notes', data: 'notes' },
          show: { origin: [CODE, { ...NOTES, mark: 'new' }] },
          say: 'The pre-push hook sends the notes to origin too.',
          ms: read(9),
        },
        {
          edges: { edge: 'pull', data: 'git pull' },
          show: { mate: [MERGE] },
          say: 'Your teammate pulls and merges payments-v2.',
          ms: read(6),
        },
        {
          edges: { edge: 'fetch-notes', data: 'notes' },
          show: { postmerge: [step('fetch git notes', '✓'), step('whyline check', '…')] },
          say: 'Post-merge fetches the notes, then runs whyline check.',
          ms: read(8),
        },
        {
          edges: { edge: 'pull', back: true, data: '2 due' },
          show: {
            postmerge: [step('fetch git notes', '✓'), step('whyline check', '✓'), { tag: 'due', tone: 'orange', text: '2 items due' }],
            mate: [MERGE, DUE_MOCK, DUE_DEMO],
          },
          say: 'Two items are now due, including the mock gateway.',
          ms: read(9),
        },
        {
          light: ['laptop', 'origin', 'mate'],
          say: 'No server, no dependencies: the record travels with the code.',
          ms: read(10),
        },
      ],
    },
    {
      label: 'CI gate',
      flow: [
        {
          edges: { edge: 'pr', data: 'PR #1' },
          show: {
            origin: [{ tag: 'PR #1', tone: 'gray', text: 'payments-v2 lands, mock gateway removed' }],
            actions: ci(0, '…'),
          },
          say: 'Two real PRs on the demo shop. PR #1 removes the mock gateway.',
          ms: read(12),
        },
        {
          edges: { edge: 'check', data: 'CI gate' },
          show: { actions: ci(3, '…') },
          say: 'It fetches the notes and installs whyline from GitHub.',
          ms: read(9),
        },
        {
          edges: 'no',
          show: { actions: ci(4), green: [{ tag: 'pass', tone: 'green', text: 'PR #1 · nothing due', mark: '✓' }] },
          say: 'Nothing is past its condition, so the check passes.',
          ms: read(9),
        },
        {
          edges: { edge: 'pr', data: 'PR #2' },
          show: {
            origin: [{ tag: 'PR #2', tone: 'gray', text: 'payments-v2 lands, mock gateway left behind' }],
            actions: ci(0, '…'),
          },
          say: 'PR #2 leaves the mock gateway behind.',
          ms: read(7),
        },
        { edges: { edge: 'check', data: 'CI gate' }, show: { actions: ci(3, '…') }, ms: 1500 },
        {
          edges: 'yes',
          show: {
            actions: ci(3, '✗'),
            red: [
              { tag: 'error', tone: 'orange', text: 'src/payments/mock_gateway.py', mono: true },
              { tag: 'L-12d3fa', tone: 'orange', text: 'mock · no references outside the file and its tests' },
            ],
          },
          say: 'No references left: exit 2, error on the file.',
          ms: read(9),
        },
        {
          light: ['red'],
          say: 'The condition Whyline recorded for the mock is now a gate.',
          ms: read(11),
        },
      ],
    },
    {
      label: 'dashboard',
      flow: [
        {
          show: { pages: pages(0) },
          light: ['pages'],
          say: 'In the Whyline repo, every push to main runs pages.yml.',
          ms: read(10),
        },
        {
          show: { pages: pages(3) },
          say: 'It rebuilds the demo from recorded sessions and runs whyline report.',
          ms: read(11),
        },
        {
          edges: { edge: 'deploy', data: 'report' },
          show: { pages: pages(4), report: VIEWS },
          say: 'One offline HTML page, six views, live on GitHub Pages.',
          ms: read(10),
        },
        {
          edges: { edge: 'bom', data: 'AI BOM' },
          show: { bom: BOM },
          say: 'AI bill of materials: 49 of 96 lines AI-written, 7 Bob sessions.',
          ms: read(11),
        },
        {
          light: ['bom'],
          say: 'In a live Bob IDE run, cost comes from Bob’s task DB.',
          ms: read(11),
        },
        {
          light: ['report', 'bom'],
          say: '47 unreviewed AI lines, with test coverage shown when a report exists.',
          ms: read(12),
        },
      ],
    },
    {
      label: 'team tier',
      flow: [
        {
          show: { policy: [POLICY] },
          light: ['policy'],
          say: 'Proposed Team tier: an org admin sets Bob’s EnforcedHooks policy once.',
          ms: read(11),
        },
        {
          edges: { edge: 'enforce', data: 'EnforcedHooks' },
          show: { bobs: HOOKS },
          say: 'Every developer’s Bob would then run the four whyline hooks.',
          ms: read(10),
        },
        {
          show: { origin: [CODE, NOTES] },
          light: ['origin'],
          say: 'With whyline init in each repo, notes land beside the code.',
          ms: read(11),
        },
        {
          show: { report: [{ tag: 'org', tone: 'blue', text: 'Org dashboard', meta: 'proposed' }, ...VIEWS] },
          light: ['report'],
          say: 'Proposed: one dashboard across the org’s repos.',
          ms: read(7),
        },
        {
          edges: { edge: 'release', data: 'per release' },
          show: {
            lead: [
              { tag: 'record', tone: 'green', text: 'report per release', meta: 'proposed' },
              { tag: 'for', tone: 'gray', text: 'the lead who signs off' },
            ],
          },
          say: 'Proposed: each release keeps its report as a compliance record.',
          ms: read(10),
        },
        {
          show: { policy: [POLICY, { tag: 'free', tone: 'green', text: 'MIT CLI stays free' }] },
          light: ['policy'],
          say: 'The MIT CLI, skills and dashboard stay free.',
          ms: read(8),
        },
      ],
    },
  ],
};

export default {
  title: 'Whyline 2 · Across the team',
  source: 'SAL-Sovereign-AI-Labs/whyline-demo-shop (whyline.yml) · SAL-Sovereign-AI-Labs/whyline (pages.yml)',
  props,
} satisfies Figure;
