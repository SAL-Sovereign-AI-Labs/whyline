import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Eyebrow, Ext, LINKS, Reveal, Terminal, type TermLine } from '../ui';

// Sara and the mock, told as a sticky scroll: the steps scroll on the left, the screen on the right swaps to match.
// Terminal output is from the real demo shop run (site copy, section 4). Step 4 is the Bob proof prompt, step 5 the PR 1 check.

type Step = { title: string; body: ReactNode; screen: Screen };
type Screen = { kind: 'term'; title: string; lines: TermLine[]; bob?: boolean } | { kind: 'check' };

const STEPS: Step[] = [
  {
    title: 'A mystery in production.',
    body: (
      <>
        Sara, a backend developer at a payments startup, finds a mock payment gateway in production. <code>git blame</code> says she committed it
        three weeks ago.
      </>
    ),
    screen: {
      kind: 'term',
      title: 'demo-shop: git blame',
      lines: [
        { t: 'cmd', text: 'git blame -L 3,3 src/payments/mock_gateway.py' },
        { t: 'out', text: 'b1170309 (demo 2026-09-27 16:10:31 +0500 3)     def charge(self, total):' },
      ],
    },
  },
  {
    title: 'Whyline remembers why.',
    body: <>It shows the request she gave Bob, word for word.</>,
    screen: {
      kind: 'term',
      title: 'demo-shop: whyline why',
      lines: [
        { t: 'cmd', text: 'whyline why src/payments/mock_gateway.py:3' },
        { t: 'out', text: 'written by     AI (IBM Bob)', tone: 'b' },
        { t: 'out', text: 'request        "Add a mock payment gateway ... so the checkout demo works until payments-v2 lands. ..."', tone: 'y' },
        { t: 'out', text: 'temporary code mock, waiting: still used in src/payments/checkout.py:2 and 1 more place (id L-12d3fa)' },
        { t: 'out', text: 'can go         when nothing uses MockGateway any more', tone: 'g' },
      ],
    },
  },
  {
    title: 'payments-v2 lands.',
    body: <>Nothing uses the mock any more, so it is ready to delete.</>,
    screen: {
      kind: 'term',
      title: 'demo-shop: whyline check',
      lines: [
        { t: 'cmd', text: 'git merge payments-v2 && whyline check' },
        { t: 'out', text: 'READY TO DELETE (2)', tone: 'p' },
        { t: 'out', text: '  src/payments/mock_gateway.py  mock  nothing uses MockGateway any more  L-12d3fa' },
      ],
    },
  },
  {
    title: 'Bob shows the proof and asks.',
    body: (
      <>
        She tells Bob “remove the mock payment gateway”. Bob checks nothing uses it, runs the tests, and waits.
      </>
    ),
    screen: {
      kind: 'term',
      title: 'Bob: proof it is safe to delete',
      bob: true,
      lines: [
        { t: 'out', text: 'you: remove the mock payment gateway', tone: 'c' },
        { t: 'out', text: '' },
        { t: 'out', text: 'Proof it is safe to delete: src/payments/mock_gateway.py', tone: 'b' },
        { t: 'out', text: 'why it can go    nothing uses MockGateway any more', tone: 'g' },
        { t: 'out', text: '' },
        { t: 'out', text: 'Delete it and commit? (yes or no)', tone: 'y' },
      ],
    },
  },
  {
    title: 'She says yes. It is gone.',
    body: <>Bob deletes it and commits, and the deletion is saved too. The pull request check goes green.</>,
    screen: { kind: 'check' },
  },
];

function CheckPanel() {
  return (
    <div className="st-check">
      <div className="st-check-bar">
        <span className="st-check-pr">PR #1</span>
        <span>payments-v2 lands, mock gateway removed</span>
      </div>
      <div className="st-check-body">
        <div className="st-check-diff">
          <span className="st-minus">-</span>
          <span className="st-strike">src/payments/mock_gateway.py</span>
          <span className="st-del">deleted</span>
        </div>
        <div className="st-check-row">
          <span className="st-tick" aria-hidden>
            <svg viewBox="0 0 16 16" width="14" height="14">
              <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="st-check-name">
            <b>whyline / temporary-code</b>
            <span>check passed</span>
          </span>
          <Ext href={LINKS.pr1} className="st-check-link">
            Details ↗
          </Ext>
        </div>
        <p className="st-check-note">All checks have passed. Nothing ready to delete is left behind.</p>
      </div>
    </div>
  );
}

function StepScreen({ s, i }: { s: Screen; i: number }) {
  if (s.kind === 'check') return <CheckPanel key={i} />;
  return <Terminal key={i} title={s.title} lines={s.lines} className={s.bob ? 'st-bob' : ''} speed={22} minHeight={210} />;
}

export function Story() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="section dark" id="story">
      <style>{CSS}</style>
      <div className="wrap">
        <Reveal>
          <Eyebrow fig="02">The story</Eyebrow>
        </Reveal>
        <Reveal i={1} as="h2" className="h2 st-h2">
          Meet Sara. She found a <span className="em">mock</span> <strong>in production.</strong>
        </Reveal>
        <Reveal i={2} as="p" className="lead st-lead">
          One mock payment gateway, from the day it turned up to the day it was deleted. The commands and output are from our demo shop.
        </Reveal>

        <div className="st-grid">
          <ol className="st-steps">
            {STEPS.map((s, i) => (
              <li key={i} className={`st-step ${active === i ? 'on' : ''}`}>
                <div className="st-step-text" ref={(el) => void (refs.current[i] = el)} data-i={i}>
                  <div className="label st-num">
                    <span className="st-n">{String(i + 1).padStart(2, '0')}</span> / 05
                  </div>
                  <h3 className="st-title">{s.title}</h3>
                  <p className="st-body">{s.body}</p>
                </div>
                <div className="st-inline">
                  <StepScreen s={s.screen} i={i} />
                </div>
              </li>
            ))}
          </ol>

          <div className="st-stick" aria-hidden={false}>
            <div className="st-stage">
              <div className="st-progress label">
                {STEPS.map((_, i) => (
                  <span key={i} className={i <= active ? 'on' : ''} />
                ))}
                <span className="st-progress-t">
                  Step {active + 1} of {STEPS.length}
                </span>
              </div>
              <div className="st-screen">
                <StepScreen s={STEPS[active].screen} i={active} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const CSS = `
#story.dark {
  overflow: clip; /* hidden would stop the terminal sticking */
  z-index: 1;
  box-shadow: 0 0 0 100vmax var(--dark);
  clip-path: inset(0 -100vmax);
}
.st-h2 { max-width: 19ch; }
.st-lead { margin: 28px 0 0; }
.st-grid {
  display: grid;
  grid-template-columns: minmax(0, 4.3fr) minmax(0, 7.7fr);
  gap: clamp(32px, 5vw, 80px);
  margin-top: clamp(40px, 6vw, 80px);
}
.st-steps { list-style: none; margin: 0; padding: 0; }
.st-step {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-left: 1px solid var(--dark-line);
  padding-left: clamp(20px, 2.4vw, 36px);
  position: relative;
}
.st-step::before {
  content: '';
  position: absolute;
  left: -1px; top: 50%;
  width: 2px; height: 0;
  background: var(--accent);
  transform: translateY(-50%);
  transition: height 0.6s var(--ease);
}
.st-step.on::before { height: 180px; }
.st-step-text { opacity: 0.28; transition: opacity 0.5s var(--ease), transform 0.5s var(--ease); transform: translateX(-6px); }
.st-step.on .st-step-text { opacity: 1; transform: none; }
.st-num { margin-bottom: 18px; }
.st-n { color: var(--accent); }
.st-title {
  margin: 0 0 14px;
  font-weight: 600;
  font-size: clamp(28px, 3vw, 42px);
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: #fff;
}
.st-body { margin: 0; color: var(--dark-muted); font-size: clamp(17px, 1.4vw, 20px); line-height: 1.6; max-width: 38ch; }
.st-body code { font-size: 0.9em; color: #f1efe9; background: #232321; padding: 1px 6px; border-radius: 5px; }
.st-inline { display: none; }

.st-stick { position: relative; }
.st-stage { position: sticky; top: calc(50vh - 190px); }
.st-progress { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
.st-progress span:not(.st-progress-t) { width: 28px; height: 2px; background: var(--dark-line); transition: background 0.4s var(--ease); }
.st-progress span.on { background: var(--accent); }
.st-progress-t { margin-left: 12px; }
.st-screen { min-height: 300px; }
.st-screen .term, .st-screen .st-check { animation: st-in 0.5s var(--ease-out) both; }
@keyframes st-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.st-bob .term-body .p { display: none; }
.st-screen .term { font-size: 12.5px; }
#story .term-bar span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-bob .term-bar span { color: var(--accent); }

.st-check {
  background: #141413;
  border: 1px solid #2c2b29;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 30px 80px -30px rgba(0,0,0,.45);
}
.st-check-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-bottom: 1px solid #2c2b29;
  font-family: var(--mono); font-size: 12px; color: #8f8b82;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.st-check-pr { color: #fff; background: #232321; border: 1px solid #2c2b29; border-radius: 999px; padding: 2px 9px; }
.st-check-body { padding: 22px 20px 24px; }
.st-check-diff {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  font-family: var(--mono); font-size: 13.5px;
  background: rgba(224,69,58,.1); border: 1px solid rgba(224,69,58,.25);
  border-radius: 10px; padding: 10px 14px; margin-bottom: 16px;
}
.st-minus { color: #ff6b5e; font-weight: 700; }
.st-strike { color: #e9e6df; text-decoration: line-through; text-decoration-color: #ff6b5e; }
.st-del { margin-left: auto; color: #ff6b5e; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; }
.st-check-row {
  display: flex; align-items: center; gap: 14px;
  border: 1px solid rgba(74,222,128,.35);
  background: rgba(31,157,92,.12);
  border-radius: 12px; padding: 16px;
}
.st-tick {
  display: grid; place-items: center; flex: none;
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--pass); color: #fff;
  animation: st-pop 0.6s 0.2s var(--ease-out) both;
}
@keyframes st-pop { from { transform: scale(0.4); opacity: 0; } to { transform: none; opacity: 1; } }
.st-check-name { display: flex; flex-direction: column; font-family: var(--mono); font-size: 13.5px; line-height: 1.4; min-width: 0; }
.st-check-name b { color: #fff; font-weight: 600; }
.st-check-name span { color: #4ade80; }
.st-check-link { margin-left: auto; font-family: var(--mono); font-size: 12px; color: #e9e6df; text-decoration: none; border-bottom: 1px solid #555; white-space: nowrap; }
.st-check-link:hover { color: var(--accent); border-color: var(--accent); }
.st-check-note { margin: 16px 0 0; font-family: var(--mono); font-size: 12.5px; color: #8f8b82; }

@media (max-width: 900px) {
  .st-grid { display: block; }
  .st-stick { display: none; }
  .st-step { min-height: 0; padding-block: 36px; }
  .st-step::before { height: 48px; top: 36px; transform: none; }
  .st-step-text { opacity: 1; transform: none; }
  .st-inline { display: block; margin-top: 22px; min-width: 0; }
  .st-inline .term { font-size: 12px; }
  .st-inline .term-body { padding: 14px 14px 16px; }
  .st-check-diff { flex-wrap: nowrap; font-size: 12px; padding: 10px 12px; }
  .st-strike { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .st-check-row { flex-wrap: wrap; padding: 14px; }
  .st-check-name { font-size: 12.5px; flex: 1 1 calc(100% - 60px); }
  .st-check-link { margin-left: 44px; }
  .st-check-body { padding: 16px 14px 18px; }
}
`;
