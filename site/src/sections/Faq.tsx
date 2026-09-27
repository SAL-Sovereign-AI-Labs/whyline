import { useId, useState, type ReactNode } from 'react';
import { Ext, Eyebrow, LINKS, Reveal } from '../ui';

const QA: { q: string; a: ReactNode }[] = [
  {
    q: 'Is my code sent anywhere?',
    a: (
      <>
        No. Whyline makes no network calls. Requests stay in your own repository and travel only where your code travels. Don't paste
        secrets into requests.
      </>
    ),
  },
  {
    q: 'Does it slow Bob down?',
    a: <>Barely: about 0.2 seconds per file Bob edits (182 ms median).</>,
  },
  {
    q: "What if I don't use Bob?",
    a: (
      <>
        Today it records Bob only. You can still explore the demo shop and the <a href={LINKS.report}>live report</a>, and{' '}
        <code>whyline seed</code> tracks temporary-looking code already in your repository, without knowing who wrote it.
      </>
    ),
  },
  {
    q: 'What is a git note?',
    a: <>Extra data attached to a commit. Your files are not touched, and it travels with your branches.</>,
  },
  {
    q: 'Can Bob delete the history?',
    a: (
      <>
        No. A guard blocks any Bob command that would rewrite or delete it. A person with write access still can, so it's a record, not a
        tamper-proof ledger.
      </>
    ),
  },
  {
    q: 'Is this a real product?',
    a: (
      <>
        It's real and it works, but it's young. We built it in 48 hours for the IBM Bob 2.0 Hackathon (25 to 27 Sep 2026). It's{' '}
        <Ext href={LINKS.npm}>published on npm</Ext> and <Ext href={LINKS.repo}>open source under the MIT license</Ext>. The team plan is
        proposed, not built.
      </>
    ),
  },
];

function Item({ q, a, n, open, onToggle }: { q: string; a: ReactNode; n: number; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <h3 className="faq-q">
        <button type="button" aria-expanded={open} aria-controls={id + 'a'} id={id + 'q'} onClick={onToggle}>
          <span className="faq-n mono">{String(n).padStart(2, '0')}</span>
          <span className="faq-text">{q}</span>
          <span className="faq-icon" aria-hidden />
        </button>
      </h3>
      <div className="faq-a" id={id + 'a'} role="region" aria-labelledby={id + 'q'} inert={!open}>
        <div className="faq-a-inner">
          <p>{a}</p>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.faq-grid { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); gap: clamp(32px, 5vw, 80px); align-items: start; }
.faq-side .lead { margin: 22px 0 28px; }
.faq-side .numeral { display: block; margin-top: 36px; }
.faq-list { border-top: 1px solid var(--ink); }
.faq-item { border-bottom: 1px solid var(--line); }
.faq-q { margin: 0; font: inherit; }
.faq-q button {
  width: 100%; display: grid; grid-template-columns: 44px minmax(0, 1fr) 36px; align-items: center; gap: 12px;
  background: none; border: 0; padding: 26px 0; cursor: pointer; text-align: left; color: var(--ink);
  font-family: var(--sans); font-size: clamp(19px, 1.8vw, 24px); font-weight: 500; letter-spacing: -0.02em;
}
.faq-q button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 6px; }
.faq-n { font-size: 12px; color: var(--accent); letter-spacing: .1em; font-weight: 500; }
.faq-text { transition: transform .45s var(--ease); }
.faq-q button:hover .faq-text { transform: translateX(6px); }
.faq-icon { position: relative; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); transition: background .35s var(--ease), border-color .35s var(--ease), transform .45s var(--ease); }
.faq-icon::before, .faq-icon::after { content: ''; position: absolute; left: 50%; top: 50%; width: 12px; height: 1.5px; background: currentColor; transform: translate(-50%, -50%); transition: transform .45s var(--ease); }
.faq-icon::after { transform: translate(-50%, -50%) rotate(90deg); }
.faq-item.open .faq-icon { background: var(--accent); border-color: var(--accent); color: #fff; transform: rotate(180deg); }
.faq-item.open .faq-icon::after { transform: translate(-50%, -50%) rotate(0deg); }
.faq-a { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .5s var(--ease); }
.faq-item.open .faq-a { grid-template-rows: 1fr; }
.faq-a-inner { overflow: hidden; min-height: 0; }
.faq-a p { margin: 0; padding: 0 48px 28px 56px; color: var(--muted); font-size: 17px; line-height: 1.65; max-width: 66ch; opacity: 0; transform: translateY(-6px); transition: opacity .4s var(--ease), transform .5s var(--ease); }
.faq-item.open .faq-a p { opacity: 1; transform: none; transition-delay: .08s; }
.faq-a a { color: var(--ink); text-decoration-color: var(--accent); text-underline-offset: 3px; text-decoration-thickness: 1.5px; }
.faq-a code { font-size: .88em; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 1px 6px; color: var(--ink); }
@media (max-width: 900px) {
  .faq-grid { grid-template-columns: 1fr; }
  .faq-side .numeral { display: none; }
}
@media (max-width: 680px) {
  .faq-q button { grid-template-columns: 30px minmax(0, 1fr) 32px; gap: 8px; padding: 20px 0; }
  .faq-icon { width: 32px; height: 32px; }
  .faq-a p { padding: 0 0 22px 38px; font-size: 16px; }
}
`;

export function Faq() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section className="section" id="faq" aria-labelledby="faq-h">
      <style>{CSS}</style>
      <div className="wrap">
        <Eyebrow fig="11">Questions</Eyebrow>
        <div className="faq-grid">
          <div className="faq-side">
            <Reveal>
              <h2 className="h2" id="faq-h">
                Fair <span className="em">questions</span>.
              </h2>
            </Reveal>
            <Reveal i={1}>
              <p className="lead">The things people ask first. Something else? Open an issue on GitHub.</p>
            </Reveal>
            <Reveal i={2}>
              <Ext href={LINKS.repo + '/issues'} className="btn btn-ghost">
                Ask on GitHub <span className="arrow">→</span>
              </Ext>
            </Reveal>
            <span className="numeral" aria-hidden>
              11
            </span>
          </div>
          <Reveal i={1} className="faq-list">
            {QA.map((x, i) => (
              <Item key={x.q} q={x.q} a={x.a} n={i + 1} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
