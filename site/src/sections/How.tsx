import { Eyebrow, Reveal } from '../ui';

// How it works in four steps, joined by a line with an orange packet travelling along it:
// your request, into git history, out as answers, and finally a deletion that waits for your yes.

const STEPS = [
  {
    title: 'Save the request.',
    body: 'When Bob edits a file, small scripts Bob runs automatically save your request and the exact lines. No AI call, about 0.2 seconds per file.',
    chip: "Bob's automatic scripts",
  },
  {
    title: 'Save it in your git history.',
    body: 'On commit, it becomes a git note: extra data attached to the commit. Your files are not touched.',
    chip: 'git note',
  },
  {
    title: 'Ask anything.',
    body: 'Why is this line here, what can I delete, what AI code has nobody changed, how much of this release is AI.',
    chip: 'whyline why / check',
  },
  {
    title: 'Bob cleans up, with your yes.',
    body: 'When temporary code is ready to delete, Bob shows the proof and deletes it only after you say yes.',
    chip: 'your yes',
  },
];

export function How() {
  return (
    <section className="section" id="how">
      <style>{CSS}</style>
      <div className="wrap">
        <Reveal>
          <Eyebrow fig="03">How it works</Eyebrow>
        </Reveal>
        <div className="hw-head">
          <Reveal i={1} as="h2" className="h2">
            Four steps. <strong>Nothing new</strong> to <span className="em">type.</span>
          </Reveal>
          <Reveal i={2} as="p" className="lead hw-lead">
            Work in Bob as usual. Whyline listens, writes to git, and answers when you ask.
          </Reveal>
        </div>

        <ol className="hw-row">
          <li className="hw-line" aria-hidden>
            <span className="hw-packet" />
            <span className="hw-packet hw-packet-2" />
          </li>
          {STEPS.map((s, i) => (
            <Reveal as="li" key={i} i={i} className="hw-step">
              <div className="hw-node" aria-hidden>
                <span />
              </div>
              <div className="numeral hw-num" aria-hidden>
                {i + 1}
              </div>
              <h3 className="h3 hw-title">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h3>
              <p className="hw-body">{s.body}</p>
              <span className="hw-chip mono">{s.chip}</span>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

const CSS = `
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.hw-head { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 40px; align-items: end; }
.hw-lead { margin: 0; }
.hw-row {
  list-style: none; margin: clamp(56px, 7vw, 96px) 0 0; padding: 0;
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(24px, 3vw, 44px);
}
.hw-line {
  position: absolute; left: 0; right: 0; top: 7px; height: 1px;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--ink) 40%, transparent) 0 6px, transparent 6px 12px);
}
.hw-packet {
  position: absolute; top: -3px; left: 0;
  width: 64px; height: 7px; border-radius: 4px;
  background: linear-gradient(90deg, transparent, var(--accent));
  box-shadow: 0 0 16px 2px rgba(255, 90, 31, 0.45);
  animation: hw-run 5.2s linear infinite;
}
.hw-packet-2 { animation-delay: -2.6s; }
@keyframes hw-run { from { left: -64px; } to { left: 100%; } }
.hw-step { position: relative; padding-top: 44px; display: flex; flex-direction: column; }
.hw-node {
  position: absolute; top: 0; left: 0;
  width: 15px; height: 15px; border-radius: 50%;
  background: var(--paper); border: 1px solid var(--ink);
  display: grid; place-items: center;
}
.hw-node span { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
.hw-num {
  font-size: clamp(96px, 10vw, 150px);
  /* Fill with the page colour, painted over the stroke, hides the font's inner overlap lines. */
  color: var(--paper);
  -webkit-text-stroke: 2.4px var(--ink);
  paint-order: stroke fill;
  margin-bottom: 26px;
  transition: color 0.4s var(--ease), -webkit-text-stroke-color 0.4s var(--ease);
}
.hw-step:hover .hw-num { -webkit-text-stroke-color: var(--accent); }
.hw-title { margin-bottom: 12px; }
.hw-body { margin: 0 0 22px; color: var(--muted); font-size: 16px; line-height: 1.6; }
.hw-chip {
  margin-top: auto; align-self: flex-start;
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; letter-spacing: 0.04em;
  padding: 6px 12px; border-radius: 999px;
  border: 1px solid var(--line); background: var(--card); color: var(--ink);
}
.hw-chip::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }

@media (max-width: 980px) {
  .hw-head { grid-template-columns: 1fr; gap: 20px; }
  .hw-row { grid-template-columns: 1fr; gap: 44px; padding-left: 36px; }
  .hw-line {
    left: 7px; right: auto; top: 0; bottom: 0; width: 1px; height: auto;
    background: repeating-linear-gradient(180deg, color-mix(in srgb, var(--ink) 40%, transparent) 0 6px, transparent 6px 12px);
  }
  .hw-packet {
    left: -3px; top: 0; width: 7px; height: 64px;
    background: linear-gradient(180deg, transparent, var(--accent));
    animation-name: hw-run-y;
  }
  @keyframes hw-run-y { from { top: -64px; } to { top: 100%; } }
  .hw-step { padding-top: 0; }
  .hw-node { left: -36px; top: 6px; }
  .hw-num { font-size: 88px; margin-bottom: 18px; }
}
`;
