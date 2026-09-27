import type { FigBeat, Figure, FigRow } from '../src';

// Whyline, part 1: what happens in your editor. Bob writes, Bob's hooks record, a commit seals a git note,
// the CLI answers, and Bob removes temporary code only after you approve.
// Told with the demo shop from whyline/demo: a live cart helper (record, commit), then the mock payment
// gateway item L-12d3fa (why, lifecycle, remove). Outputs, ids and hashes are from the real recorded run.
// Four framed columns, and every edge joins neighbouring columns or adjacent boxes, so nothing crosses a box.

// A beat long enough to read its caption: the engine plays at 1.25x, and a reader needs ~230 ms a word.
const beat = (b: FigBeat): FigBeat => {
  if (typeof b.say !== 'string') return b;
  const need = Math.ceil((1.25 * (b.say.split(/\s+/).length * 230 + 700)) / 100) * 100;
  return { ...b, ms: Math.max(b.ms ?? 0, need) };
};

const CART: FigRow = {
  tag: 'you',
  tone: 'gray',
  text: '“Add a small cart helper in src/shop/cart.py that returns the item count of an Order.”',
};
const WHY_Q: FigRow = { tag: 'you', tone: 'gray', text: '“Why does src/payments/mock_gateway.py:2 exist?”' };
const REMOVE_Q: FigRow = { tag: 'you', tone: 'gray', text: '“Remove the mock payment gateway.”' };

const S_PROMPT: FigRow = { tag: 'prompt', tone: 'purple', text: '“Add a small cart helper…”' };
const S_WRITE: FigRow = { tag: 'write', tone: 'blue', text: 'src/shop/cart.py', meta: 'lines + snapshot' };
const CAPTURED: FigRow[] = [
  { tag: 'lines', tone: 'blue', text: 'src/shop/cart.py', meta: 'every line Bob wrote' },
  { tag: 'snapshot', tone: 'gray', text: 'file as Bob left it' },
];

const NOTE_MOCK: FigRow = { tag: 'earlier', tone: 'gray', text: 'mock gateway note', meta: 'd2b9320' };
const NOTE_CART: FigRow = { tag: 'new', tone: 'blue', text: 'cart helper note', meta: 'sessions · lines · items' };
const CONDITION: FigRow = { text: 'due when nothing uses MockGateway' };

const EVIDENCE: FigRow[] = [
  REMOVE_Q,
  { tag: 'due', tone: 'orange', text: 'mock gateway', meta: 'L-12d3fa' },
  { tag: 'grep', tone: 'gray', text: 'git grep MockGateway', meta: 'no hits outside the file' },
  { tag: 'dry run', tone: 'green', text: 'removal + tests', meta: 'tests pass', mark: '✓' },
];

const props: Figure['props'] = {
  speed: 2200,
  layout: {
    gap: 70,
    children: [
      {
        id: 'you',
        label: 'You + IBM Bob',
        direction: 'column',
        gap: 44,
        children: [
          { id: 'dev', label: 'You', sub: 'Bob IDE · terminal', hint: 'your prompt and answers', lines: 8, width: 210 },
          { id: 'bob', label: 'IBM Bob', sub: 'Agent mode', hint: 'what Bob is doing', lines: 3, width: 210 },
          { id: 'tree', label: 'Working tree', sub: 'your code', hint: 'your files', shape: 'store', lines: 3, width: 210 },
        ],
      },
      {
        id: 'triggers',
        label: 'Triggers',
        direction: 'column',
        gap: 26,
        children: [
          {
            id: 'bobhooks',
            label: 'Bob hooks · .bob/settings.json',
            direction: 'column',
            gap: 10,
            children: [
              { id: 'h-prompt', label: 'UserPromptSubmit', sub: 'the first prompt' },
              { id: 'h-write', label: 'PostToolUse', sub: 'every file write' },
              { id: 'h-start', label: 'SessionStart', sub: 'what is due' },
              { id: 'h-guard', label: 'PreToolUse', sub: 'guard: record is read-only' },
            ],
          },
          { id: 'skills', label: '6 Whyline skills', sub: '.bob/skills', hint: 'the skill Bob picks', lines: 1, width: 210 },
          { id: 'approve', label: 'you approve?', shape: 'decision' },
          {
            id: 'githooks',
            label: 'git hooks · .git/hooks',
            direction: 'column',
            gap: 10,
            children: [
              { id: 'post-merge', label: 'post-merge', sub: 'fetch notes · check' },
              { id: 'post-commit', label: 'post-commit', sub: 'commit · report' },
            ],
          },
        ],
      },
      {
        // wider gap: the commit edges and their labels share this space
        gap: 110,
        children: [
          {
            id: 'cli',
            label: 'Whyline CLI · no model, 0 Bobcoins',
            direction: 'column',
            gap: 40,
            children: [
              {
                direction: 'column',
                gap: 40,
                children: [
                  {
                    id: 'capture',
                    label: 'capture',
                    sub: 'shell hook · always exits 0',
                    hint: 'prompt + lines Bob wrote',
                    lines: 3,
                    width: 240,
                  },
                  {
                    id: 'answers',
                    label: 'why · check · unreviewed · bom',
                    sub: 'answers',
                    hint: 'why · check · bom answers',
                    lines: 6,
                    width: 240,
                  },
                ],
              },
              {
                id: 'commit',
                label: 'commit · label lines',
                sub: 'ai · ai-edited · human',
                hint: 'labels each line',
                lines: 5,
                width: 240,
              },
            ],
          },
          {
            id: 'repo',
            label: 'Git repo',
            direction: 'column',
            gap: 60,
            children: [
              {
                id: 'session',
                label: 'Session log',
                sub: '.git/whyline/session.jsonl',
                hint: 'what Bob did, until commit',
                shape: 'store',
                lines: 3,
                width: 210,
              },
              {
                id: 'notes',
                label: 'Git notes',
                sub: 'refs/notes/whyline',
                hint: 'one note per commit',
                shape: 'store',
                lines: 5,
                width: 210,
              },
            ],
          },
        ],
      },
    ],
  },
  edges: [
    { id: 'prompt', from: 'dev', to: 'bob', label: 'prompt' },
    { id: 'write', from: 'bob', to: 'tree', label: 'write_file' },
    { id: 'b-prompt', from: 'bob', to: 'h-prompt' },
    { id: 'b-write', from: 'bob', to: 'h-write' },
    { id: 'b-guard', from: 'bob', to: 'h-guard' },
    { id: 'b-start', from: 'bob', to: 'h-start' },
    { id: 'b-skill', from: 'bob', to: 'skills' },
    { id: 'cap-p', from: 'h-prompt', to: 'capture' },
    { id: 'cap-w', from: 'h-write', to: 'capture' },
    { id: 's-start', from: 'h-start', to: 'answers', label: 'session-start' },
    { id: 'run', from: 'skills', to: 'answers', label: 'runs' },
    { id: 'ask', from: 'skills', to: 'approve' },
    { id: 'yes', from: 'approve', to: 'tree', label: 'yes' },
    { id: 'git', from: 'tree', to: 'githooks', label: 'git commit' },
    { id: 'pc', from: 'post-commit', to: 'commit' },
    { id: 'pm', from: 'post-merge', to: 'answers', label: 'check' },
    { id: 'append', from: 'capture', to: 'session', label: 'append' },
    { id: 'read-session', from: 'session', to: 'commit', quiet: true },
    { id: 'attach', from: 'commit', to: 'notes', label: 'attach' },
    { id: 'read', from: 'answers', to: 'notes', label: 'read', quiet: true },
  ],
  steps: [
    {
      label: 'record',
      flow: [
        beat({
          edges: { edge: 'prompt', data: 'prompt' },
          show: { dev: [CART] },
          say: 'You ask Bob for a cart helper. Nothing new to type.',
        }),
        beat({
          edges: 'b-prompt',
          say: 'UserPromptSubmit fires: a shell command, no model.',
        }),
        {
          edges: 'cap-p',
          show: { capture: [{ tag: 'prompt', tone: 'purple', text: 'first prompt of the session' }] },
          ms: 1800,
        },
        beat({
          edges: { edge: 'append', data: 'prompt' },
          show: { session: [S_PROMPT] },
          say: 'capture logs the session’s first prompt.',
        }),
        beat({
          edges: { edge: 'write', data: 'write_file' },
          show: {
            bob: [{ text: 'write_file src/shop/cart.py', mono: true, mark: '✓' }],
            tree: [{ tag: 'new', tone: 'green', text: 'src/shop/cart.py', mono: true }],
          },
          say: 'Bob writes src/shop/cart.py.',
        }),
        beat({
          edges: { edge: 'b-write', data: 'tool call' },
          say: 'PostToolUse fires after every write_file, write_to_file, apply_diff, insert_content or search_and_replace.',
        }),
        beat({
          edges: 'cap-w',
          show: { capture: CAPTURED },
          say: 'capture keeps the exact lines and a file snapshot.',
        }),
        {
          edges: { edge: 'append', data: 'write' },
          show: { session: [S_PROMPT, S_WRITE] },
          ms: 1800,
        },
        beat({
          show: {
            capture: [...CAPTURED, { tag: 'cost', tone: 'green', text: '181 ms · 0 Bobcoins', meta: 'no model call', mark: '✓' }],
          },
          light: ['capture'],
          say: '181 ms per capture, 0 Bobcoins. It never blocks Bob.',
        }),
      ],
    },
    {
      label: 'commit',
      flow: [
        beat({
          edges: { edge: 'git', data: 'commit' },
          show: { dev: [CART, { tag: 'git', tone: 'gray', text: 'git commit', mono: true }] },
          say: 'You commit as usual.',
        }),
        beat({
          edges: { edge: 'pc', data: 'whyline commit' },
          say: 'post-commit runs whyline commit.',
        }),
        beat({
          edges: { edge: 'read-session', data: 'session log' },
          show: {
            commit: [
              { tag: 'ai', tone: 'blue', text: 'src/shop/cart.py', meta: 'every line Bob wrote' },
              { tag: 'ai-edited', tone: 'blue', text: 'AI, then edited by you', meta: 'none here' },
              { tag: 'human', tone: 'gray', text: 'not in the note' },
            ],
          },
          say: 'It labels each line: AI, AI then edited by you, or human.',
        }),
        beat({
          show: {
            commit: [
              { tag: 'ai', tone: 'blue', text: 'src/shop/cart.py', meta: 'every line Bob wrote' },
              { tag: 'earlier', tone: 'orange', text: 'mock gateway', meta: 'L-12d3fa · until payments-v2 lands' },
              CONDITION,
            ],
          },
          light: ['commit'],
          say: 'Temporary-looking writes, like Bob’s earlier mock gateway, become items with a removal condition.',
        }),
        beat({
          edges: { edge: 'attach', data: 'one note' },
          show: { notes: [NOTE_MOCK, NOTE_CART] },
          say: 'It attaches one JSON note to the commit.',
        }),
        beat({
          edges: { edge: 'read-session', back: true, data: 'consumed' },
          show: { session: [S_PROMPT, { tag: 'write', tone: 'gray', text: 'consumed', mark: '✓' }] },
          say: 'Write lines are consumed; the prompt stays for later commits.',
        }),
        beat({
          show: {
            commit: [
              { tag: 'ai', tone: 'blue', text: 'src/shop/cart.py', meta: 'every line Bob wrote' },
              { tag: 'report', tone: 'green', text: 'whyline report', meta: 'in the background', mark: '✓' },
            ],
            tree: [{ tag: 'ignored', tone: 'green', text: '.whyline-report.html', meta: 'in .git/info/exclude', mark: '✓' }],
          },
          say: 'whyline report rebuilds the dashboard into a git-ignored file. git status stays clean.',
        }),
      ],
    },
    {
      label: 'why',
      flow: [
        beat({
          edges: { edge: 'prompt', data: 'why?' },
          show: { dev: [WHY_Q] },
          say: 'You ask Bob why a line exists.',
        }),
        beat({
          edges: { edge: 'b-skill', data: 'whyline-why' },
          show: { skills: [{ text: 'whyline-why', mono: true, mark: 'active' }] },
          say: 'Bob picks the whyline-why skill.',
        }),
        beat({
          edges: { edge: 'run', data: 'why' },
          show: { answers: [{ text: 'why src/payments/mock_gateway.py:2', mono: true }] },
          say: 'The skill runs whyline why on that line.',
        }),
        beat({
          edges: { edge: 'read', data: 'blame' },
          show: {
            notes: [
              { ...NOTE_MOCK, tag: 'note', mark: 'read' },
              { ...NOTE_CART, tag: 'note' },
            ],
          },
          say: 'git blame finds commit d2b9320; why reads its note.',
        }),
        beat({
          edges: { edge: 'read', back: true, data: 'note' },
          show: {
            answers: [
              { tag: 'origin', tone: 'blue', text: 'ai (bob)', meta: 'session a1c3e5f7' },
              { tag: 'prompt', tone: 'purple', text: '“Add a mock payment gateway … until payments-v2 lands.”' },
              { tag: 'with', tone: 'gray', text: 'checkout.py:2-2 · checkout.py:6-8', mono: true },
              { tag: 'item', tone: 'orange', text: 'mock gateway', meta: 'L-12d3fa · active' },
              { tag: 'commit', tone: 'gray', text: 'd2b9320', mono: true },
            ],
          },
          say: 'Bob wrote it in session a1c3e5f7, from this prompt. It is still a temporary item.',
        }),
        {
          edges: [
            { edge: 'run', back: true },
            { edge: 'b-skill', back: true },
          ],
          ms: 1600,
        },
        beat({
          edges: { edge: 'prompt', back: true, data: 'answer' },
          show: {
            dev: [
              WHY_Q,
              { tag: 'bob', tone: 'blue', text: 'Bob wrote it (session a1c3e5f7) from the prompt “…until payments-v2 lands.”' },
              { tag: 'item', tone: 'orange', text: 'temporary mock', meta: 'L-12d3fa · active' },
            ],
          },
          say: 'git blame tells you who. Whyline tells you why.',
        }),
      ],
    },
    {
      label: 'lifecycle',
      flow: [
        beat({
          edges: { edge: 'git', data: 'merge' },
          show: { dev: [{ tag: 'git', tone: 'gray', text: 'git merge payments-v2', mono: true }] },
          say: 'payments-v2 lands. You merge it.',
        }),
        beat({
          edges: { edge: 'pm', data: 'check' },
          say: 'post-merge fetches the notes, then runs whyline check.',
        }),
        beat({
          edges: { edge: 'read', data: 'items' },
          show: { notes: [{ tag: 'item', tone: 'orange', text: 'mock gateway', meta: 'L-12d3fa · active' }, CONDITION] },
          say: 'check recomputes every open item’s condition.',
        }),
        beat({
          edges: { edge: 'read', back: true },
          show: {
            answers: [
              { tag: 'refs', tone: 'gray', text: 'MockGateway', meta: 'no references outside the file and its tests' },
              { tag: 'due', tone: 'orange', text: 'mock gateway', meta: 'L-12d3fa · active → due', mark: 'new' },
              { tag: 'life', tone: 'gray', text: 'active → due → kept | removed' },
            ],
          },
          say: 'MockGateway has no references outside its file and tests, so the mock is now due.',
        }),
        beat({
          edges: [
            { edge: 'pm', back: true },
            { edge: 'git', back: true, data: 'due' },
          ],
          show: {
            dev: [
              { tag: 'git', tone: 'gray', text: 'git merge payments-v2', mono: true },
              { tag: 'due', tone: 'orange', text: 'mock gateway', meta: 'L-12d3fa' },
              { tag: 'due', tone: 'gray', text: '1 other item', meta: 'already due' },
            ],
          },
          say: 'The hook prints what is due. You decide: keep or remove.',
        }),
        beat({
          edges: { edge: 'b-guard', data: 'git notes remove' },
          show: {
            bob: [{ tag: 'blocked', tone: 'orange', text: 'git notes --ref=whyline remove', mono: true, meta: 'exit 2' }],
          },
          say: 'Bob cannot shortcut it: the PreToolUse guard blocks any shell command that rewrites or deletes the notes.',
        }),
      ],
    },
    {
      label: 'remove',
      flow: [
        beat({
          edges: { edge: 'b-start', data: 'new session' },
          say: 'Next session, SessionStart asks whyline what is due.',
        }),
        beat({
          edges: { edge: 'b-start', back: true, data: 'due' },
          show: {
            bob: [
              {
                tag: 'context',
                tone: 'purple',
                text: '“whyline: … temporary item(s) due for removal: … mock_gateway.py (L-12d3fa) … To act, say "remove mock_gateway.py" …”',
              },
            ],
          },
          say: 'Bob’s context now says: the mock gateway is due.',
        }),
        beat({
          edges: { edge: 'prompt', data: 'remove it' },
          show: { dev: [REMOVE_Q] },
          say: 'You ask Bob to remove it.',
        }),
        {
          edges: { edge: 'b-skill', data: 'whyline-remove' },
          show: { skills: [{ text: 'whyline-remove', mono: true, mark: 'active' }] },
          ms: 1800,
        },
        beat({
          edges: { edge: 'run', data: 'check --json' },
          show: { answers: EVIDENCE.slice(1) },
          say: 'The skill gathers evidence: check, git grep, a dry run.',
        }),
        beat({
          edges: [
            { edge: 'run', back: true },
            { edge: 'b-skill', back: true },
            { edge: 'prompt', back: true, data: 'evidence' },
          ],
          show: { dev: [...EVIDENCE, { tag: 'ask', tone: 'blue', text: 'Remove it?', mark: '…' }] },
          say: 'Bob shows the evidence and waits. Nothing is deleted on its own.',
        }),
        beat({
          edges: 'ask',
          light: ['approve'],
          show: { dev: [...EVIDENCE, { tag: 'you', tone: 'green', text: 'yes, remove it', mark: '✓' }] },
          say: 'You approve.',
          ms: 2000,
        }),
        beat({
          edges: { edge: 'yes', data: 'delete' },
          show: {
            tree: [
              { tag: 'removed', tone: 'orange', text: 'mock_gateway.py', meta: 'src/payments' },
              { tag: 'tests', tone: 'green', text: '2 passed', mark: '✓' },
            ],
          },
          say: 'Bob deletes it for real; the tests rerun: 2 passed.',
        }),
        beat({
          edges: { edge: 'git', data: 'commit' },
          show: { bob: [{ tag: 'commit', tone: 'green', text: '“remove L-12d3fa: until payments-v2 lands”', meta: 'no push', mark: '✓' }] },
          say: 'Bob commits “remove L-12d3fa: until payments-v2 lands”. It never pushes.',
        }),
        {
          edges: 'pc',
          show: { commit: [{ tag: 'removal', tone: 'green', text: 'mock gateway', meta: 'L-12d3fa → removed', mark: '✓' }] },
          ms: 1600,
        },
        beat({
          edges: { edge: 'attach', data: 'removed' },
          show: {
            notes: [
              { ...NOTE_MOCK, tag: 'note' },
              { tag: 'new', tone: 'gray', text: 'removal note', meta: 'bdf52fd' },
              { tag: 'item', tone: 'green', text: 'mock gateway', meta: 'L-12d3fa · removed', mark: '✓' },
            ],
          },
          say: 'post-commit records the removal in a new note.',
        }),
      ],
    },
  ],
};

export default {
  title: 'Whyline 1 · In your editor',
  source: 'whyline/README.md',
  props,
} satisfies Figure;
