import { Eyebrow, Ext, LINKS, Reveal, Terminal, type TermLine } from '../ui';

// The CI story: GitHub Actions runs `whyline check --gate` on the demo shop's two real pull requests.
// Output lines are from a real run of `whyline check --gate` on the demo shop (exit 2).

const GATE: TermLine[] = [
  { t: 'cmd', text: 'whyline check --gate' },
  { t: 'out', text: 'READY TO DELETE (2)', tone: 'p' },
  { t: 'out', text: '  src/payments/mock_gateway.py  mock  nothing uses MockGateway any more' },
  { t: 'out', text: '  examples/demo_orders.py       demo  nothing uses demo_orders any more' },
  { t: 'out', text: '' },
  {
    t: 'out',
    text: '2 ready to delete, 4 waiting, 0 kept on purpose, 0 deleted. Next: tell Bob "remove mock_gateway.py" and it shows the proof and asks before deleting.',
    tone: 'c',
  },
  { t: 'cmd', text: 'echo $?' },
  { t: 'out', text: '2', tone: 'r' },
];

function Mark({ ok }: { ok: boolean }) {
  return (
    <span className={`ci-mark ${ok ? 'ok' : 'bad'}`} aria-hidden>
      <svg viewBox="0 0 16 16" width="14" height="14">
        {ok ? (
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}

function PrCard({ ok, n, title, sub, href, detail }: { ok: boolean; n: number; title: string; sub: string; href: string; detail: string }) {
  return (
    <Ext href={href} className={`ci-card ${ok ? 'ok' : 'bad'}`}>
      <div className="ci-card-top">
        <span className="label ci-pr">PR #{n}</span>
        <span className={`label ci-state ${ok ? 'ok' : 'bad'}`}>{ok ? 'Passed' : 'Failed'}</span>
      </div>
      <h3 className="h3 ci-title">{sub}</h3>
      <p className="ci-branch mono">{title}</p>
      <div className="ci-check">
        <Mark ok={ok} />
        <div className="ci-check-text mono">
          <b>whyline / temporary-code</b>
          <span>{detail}</span>
        </div>
      </div>
      <span className="ci-open label">
        Open on GitHub <span className="arrow">↗</span>
      </span>
    </Ext>
  );
}

export function CiGate() {
  return (
    <section className="section" id="ci">
      <style>{CSS}</style>
      <div className="wrap">
        <Reveal>
          <Eyebrow fig="07">The pull request check</Eyebrow>
        </Reveal>
        <Reveal i={1} as="h2" className="h2 ci-h2">
          Your pull request check knows what should be <span className="em">gone.</span>
        </Reveal>
        <Reveal i={2} as="p" className="lead ci-lead">
          GitHub Actions runs <code>whyline check --gate</code>. It exits <b>2</b> while temporary code that is ready to delete is still there.
        </Reveal>

        <div className="ci-grid">
          <div className="ci-cards">
            <Reveal i={0}>
              <PrCard
                ok
                n={1}
                sub="The mock is deleted. Check passes."
                title="payments-v2 lands, mock gateway removed"
                href={LINKS.pr1}
                detail="passed"
              />
            </Reveal>
            <Reveal i={1}>
              <PrCard
                ok={false}
                n={2}
                sub="The mock is left behind. Check fails."
                title="payments-v2 lands, mock gateway left behind"
                href={LINKS.pr2}
                detail="failed: src/payments/mock_gateway.py is ready to delete (exit 2)"
              />
            </Reveal>
          </div>
          <Reveal i={2} className="ci-term">
            <Terminal title="github actions: whyline" lines={GATE} speed={30} />
            <div className="ci-cta">
              <Ext href={`${LINKS.shop}/pulls?q=is%3Apr`} className="btn btn-primary">
                See both checks <span className="arrow">→</span>
              </Ext>
              <span className="label">Live on the demo shop</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const CSS = `
.ci-h2 { max-width: 21ch; }
.ci-lead { margin: 28px 0 0; }
.ci-lead code { font-size: 0.8em; color: var(--ink); background: var(--card); border: 1px solid var(--line); padding: 1px 7px; border-radius: 6px; }
.ci-grid {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: clamp(24px, 3vw, 44px); margin-top: clamp(44px, 6vw, 80px); align-items: start;
}
.ci-cards { display: grid; gap: 18px; }
.ci-card {
  display: block; text-decoration: none; color: var(--ink);
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
  padding: clamp(22px, 2.2vw, 28px);
  position: relative; overflow: hidden;
  transition: transform 0.35s var(--ease), box-shadow 0.35s var(--ease), border-color 0.35s var(--ease);
}
.ci-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.ci-card.ok::before { background: var(--pass); }
.ci-card.bad::before { background: var(--fail); }
.ci-card:hover { transform: translateY(-3px); box-shadow: 0 24px 50px -30px rgba(12,12,13,.35); border-color: var(--ink); }
.ci-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.ci-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.ci-pr { color: var(--ink); }
.ci-state { padding: 4px 10px; border-radius: 999px; font-size: 11px; }
.ci-state.ok { color: var(--pass); background: rgba(31,157,92,.1); }
.ci-state.bad { color: var(--fail); background: rgba(224,69,58,.1); }
.ci-title { margin-bottom: 6px; }
.ci-branch { margin: 0 0 18px; font-size: 12.5px; color: var(--muted); }
.ci-check {
  display: flex; gap: 12px; align-items: flex-start;
  border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; background: var(--paper);
}
.ci-mark { flex: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #fff; }
.ci-mark.ok { background: var(--pass); }
.ci-mark.bad { background: var(--fail); }
.ci-check-text { display: flex; flex-direction: column; font-size: 13px; line-height: 1.45; min-width: 0; overflow-wrap: anywhere; }
.ci-check-text b { font-weight: 600; }
.ci-card.ok .ci-check-text span { color: var(--pass); }
.ci-card.bad .ci-check-text span { color: var(--fail); }
.ci-open { display: inline-flex; gap: 8px; margin-top: 16px; font-size: 11px; color: var(--muted); }
.ci-card:hover .ci-open { color: var(--accent-ink); }
.ci-card .arrow { transition: transform 0.3s var(--ease); }
.ci-card:hover .arrow { transform: translate(2px, -2px); }
.ci-term .term { font-size: 12.5px; }
.ci-term .term-body { min-height: 300px; }
.ci-cta { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-top: 24px; }
@media (max-width: 900px) {
  .ci-grid { grid-template-columns: 1fr; }
  .ci-term .term { font-size: 11px; }
  .ci-check { padding: 12px; }
  .ci-check-text { font-size: 12px; }
  .ci-term .term-body { min-height: 0; padding: 14px; }
}
`;
