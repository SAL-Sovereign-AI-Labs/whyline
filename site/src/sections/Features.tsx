import { useEffect, useState, type ReactNode } from 'react';
import { CountUp, Eyebrow, Reveal, Terminal, useInView, LINKS, type TermLine } from '../ui';

const WHY: TermLine[] = [
  { t: 'cmd', text: 'whyline why src/payments/mock_gateway.py:3' },
  { t: 'out', text: 'written by     AI (IBM Bob)', tone: 'y' },
  { t: 'out', text: 'asked by       demo, on 2026-09-27, in Bob chat a1c3e5f7' },
  { t: 'out', text: 'other files this request changed', tone: 'c' },
  { t: 'out', text: '               src/payments/checkout.py:2' },
  { t: 'out', text: '               src/payments/checkout.py:6-8' },
];

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Real `whyline check` rows from the demo shop, before and after payments-v2 merges. */
function CheckDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [merged, setMerged] = useState(false);
  useEffect(() => {
    if (!inView || reduced()) return;
    const id = setInterval(() => setMerged((m) => !m), 2600);
    return () => clearInterval(id);
  }, [inView]);
  const rows: { file: string; kind: string; ready: boolean }[] = [
    { file: 'src/payments/mock_gateway.py', kind: 'mock', ready: merged },
    { file: 'examples/demo_orders.py', kind: 'demo', ready: true },
    { file: 'config/flags.yaml', kind: 'flag', ready: false },
    { file: 'src/reports/legacy_export.py', kind: 'shim', ready: false },
  ];
  return (
    <div ref={ref} className="feat-check" aria-label="Temporary code in the demo shop">
      <div className="feat-check-top label">
        <span>{merged ? 'after payments-v2 merges' : 'before payments-v2 merges'}</span>
        <span className="feat-check-count">
          <b>{merged ? 2 : 1}</b> ready / <b>{merged ? 4 : 5}</b> waiting
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.file} className="feat-row">
          <span className="feat-kind mono">{r.kind}</span>
          <span className="feat-file mono">{r.file}</span>
          <span className={`feat-pill ${r.ready ? 'ready' : ''}`}>{r.ready ? 'ready to delete' : 'waiting'}</span>
        </div>
      ))}
    </div>
  );
}

/** 51% as a dot-matrix number, with a bar that fills to 49 of 96 lines. */
function BomDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="feat-bom">
      <div className="feat-bom-num dots">
        <CountUp to={51} suffix="%" ms={1600} />
      </div>
      <div className="feat-bar" aria-hidden>
        <i style={{ width: inView ? `${(49 / 96) * 100}%` : 0 }} />
      </div>
      <div className="feat-bom-legend label">
        <span>
          <em className="sw ai" /> written by AI · 49 of 96 lines
        </span>
        <span>
          <em className="sw" /> a person changed 2 of them since
        </span>
      </div>
    </div>
  );
}

/** The five self checks, each lighting up as it passes. */
function SelfDemo() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`feat-self ${inView ? 'in' : ''}`}>
      <div className="feat-self-row" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} style={{ transitionDelay: `${0.3 + i * 0.22}s` }} />
        ))}
      </div>
      <p className="mono">5 of 5 checks told the two cases apart.</p>
    </div>
  );
}

type Tile = {
  n: string;
  name: string;
  line: string;
  cmd: string[];
  cls: string;
  demo?: ReactNode;
};

const TILES: Tile[] = [
  {
    n: '01',
    name: 'Why is this line here?',
    line: 'See the request behind any line, and the other files it changed.',
    cmd: ['whyline why file:line'],
    cls: 'span-why hero',
    demo: <Terminal lines={WHY} speed={22} className="feat-term" title="whyline why" minHeight={176} />,
  },
  {
    n: '02',
    name: 'What can I delete?',
    line: 'Temporary code, waiting or ready to delete, with the reason.',
    cmd: ['whyline check'],
    cls: 'span-check hero',
    demo: <CheckDemo />,
  },
  {
    n: '03',
    name: 'Fail the pull request check',
    line: 'The check fails while temporary code ready to delete is still there.',
    cmd: ['whyline check --gate'],
    cls: 'span-4',
  },
  {
    n: '04',
    name: 'AI code nobody changed',
    line: 'A review queue of AI code no person has changed since.',
    cmd: ['whyline unreviewed'],
    cls: 'span-4',
  },
  {
    n: '05',
    name: 'Keep it on purpose',
    line: 'Keep a flag, or give it a date to go.',
    cmd: ['whyline keep', 'whyline until'],
    cls: 'span-4',
  },
  {
    n: '06',
    name: 'AI report for a release',
    line: 'How much of a release AI wrote, and how much a person changed.',
    cmd: ['whyline bom'],
    cls: 'span-bom hero',
    demo: <BomDemo />,
  },
  {
    n: '07',
    name: 'One page with every answer',
    line: 'An offline report, refreshed after every commit.',
    cmd: ['whyline report'],
    cls: 'span-report',
  },
  {
    n: '08',
    name: 'Built-in self check',
    line: 'Proves every check can fail, on your machine.',
    cmd: ['whyline selftest'],
    cls: 'span-self',
    demo: <SelfDemo />,
  },
];

const CSS = `
.feat-head { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 24px; margin-bottom: clamp(40px, 5vw, 72px); }
.feat-head .numeral { margin-bottom: -8px; }
.feat-head .lead { margin: 22px 0 0; }
.bento { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
.tile-cell { display: flex; min-width: 0; }
.tile {
  flex: 1; min-width: 0;
  position: relative; display: flex; flex-direction: column; gap: 12px;
  text-decoration: none; color: inherit; background: var(--card);
  border: 1px solid var(--line); border-radius: var(--radius);
  padding: clamp(22px, 2.2vw, 30px); min-height: 250px;
  transition: transform .45s var(--ease), box-shadow .45s var(--ease), border-color .45s var(--ease);
}
.tile:hover { transform: translateY(-4px); border-color: var(--ink); box-shadow: 0 24px 50px -30px rgba(12,12,13,.35); }
.tile:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.tile-top { display: flex; justify-content: space-between; align-items: center; }
.tile-n { font-family: var(--mono); font-size: 12px; letter-spacing: .16em; color: var(--accent); }
.tile-arrow {
  width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--line);
  display: grid; place-items: center; font-size: 16px; line-height: 1;
  transition: background .35s var(--ease), color .35s var(--ease), border-color .35s var(--ease), transform .45s var(--ease);
}
.tile:hover .tile-arrow { background: var(--accent); border-color: var(--accent); color: #fff; transform: rotate(45deg); }
.tile h3 { margin-top: 6px; }
.tile.hero h3 { font-size: clamp(24px, 2.3vw, 32px); font-weight: 600; letter-spacing: -0.03em; }
.tile p.tile-line { margin: 0; color: var(--muted); font-size: 16px; line-height: 1.55; max-width: 44ch; }
.tile-demo { margin: 10px 0 6px; flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.tile-cmds { margin-top: auto; display: flex; flex-wrap: wrap; gap: 8px; padding-top: 8px; }
.chip {
  font-family: var(--mono); font-size: 12.5px; padding: 6px 12px; border-radius: 999px;
  background: var(--paper); border: 1px solid var(--line); color: var(--ink-2); white-space: nowrap;
}
.chip::before { content: '$ '; color: var(--accent); }
.span-why { grid-column: span 7; }
.span-check { grid-column: span 5; }
.span-4 { grid-column: span 4; }
.span-bom { grid-column: span 6; grid-row: span 2; }
.span-report, .span-self { grid-column: span 6; }
.span-report .tile, .span-self .tile { min-height: 0; }
.feat-term { box-shadow: none; font-size: 12.5px; }
.feat-term .term-body { padding: 14px 16px 16px; }

.feat-check { border: 1px solid var(--line); border-radius: 12px; background: var(--paper); overflow: hidden; }
.feat-check-top { display: flex; justify-content: space-between; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--line); font-size: 10.5px; letter-spacing: .12em; }
.feat-check-count b { color: var(--ink); font-weight: 600; }
.feat-row { display: grid; grid-template-columns: 44px minmax(0,1fr) auto; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--line-2); font-size: 12.5px; }
.feat-row:last-child { border-bottom: 0; }
.feat-kind { color: var(--faint); font-size: 11px; }
.feat-file { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-2); }
.feat-pill {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line); color: var(--muted);
  transition: background .5s var(--ease), color .5s var(--ease), border-color .5s var(--ease);
  white-space: nowrap;
}
.feat-pill.ready { background: var(--accent); border-color: var(--accent); color: #fff; }

.feat-bom { display: grid; gap: 14px; }
.feat-bom-num { font-size: clamp(88px, 10vw, 150px); color: var(--ink); }
.feat-bar { height: 8px; border-radius: 99px; background: var(--paper-2); border: 1px solid var(--line); overflow: hidden; }
.feat-bar i { display: block; height: 100%; background: var(--accent); transition: width 1.6s var(--ease-out) .2s; }
.feat-bom-legend { display: flex; gap: 20px; flex-wrap: wrap; font-size: 11px; }
.feat-bom-legend .sw { display: inline-block; width: 9px; height: 9px; border-radius: 2px; background: var(--paper-2); border: 1px solid var(--line); margin-right: 6px; vertical-align: -1px; }
.feat-bom-legend .sw.ai { background: var(--accent); border-color: var(--accent); }

.feat-self { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.feat-self-row { display: flex; gap: 6px; }
.feat-self-row i { width: 22px; height: 22px; border-radius: 5px; border: 1px solid var(--line); background: var(--paper); transition: background .4s var(--ease), border-color .4s var(--ease); }
.feat-self.in .feat-self-row i { background: var(--pass); border-color: var(--pass); }
.feat-self p { margin: 0; font-size: 12.5px; color: var(--ink-2); }

@media (max-width: 1080px) {
  .span-why, .span-check, .span-bom { grid-column: span 12; }
  .span-4 { grid-column: span 6; }
    .span-bom { grid-row: auto; }
  .span-report, .span-self { grid-column: span 6; }
}
@media (max-width: 680px) {
  .bento > .tile-cell { grid-column: span 12; }
  .tile { min-height: 0; }
  .feat-head { grid-template-columns: 1fr; }
  .feat-head .numeral { display: none; }
  .feat-row { grid-template-columns: minmax(0,1fr) auto; }
  .feat-kind { display: none; }
  .feat-term { font-size: 11.5px; }
  .feat-term .term-body { white-space: pre; }
  .feat-check-top { flex-direction: column; gap: 2px; }
}
`;

export function Features() {
  return (
    <section className="section" id="features" aria-labelledby="features-h">
      <style>{CSS}</style>
      <div className="wrap">
        <Eyebrow fig="05">What you can ask</Eyebrow>
        <div className="feat-head">
          <div>
            <Reveal>
              <h2 className="h2" id="features-h">
                Everything you can ask, <strong>one</strong> <span className="em">command</span> each.
              </h2>
            </Reveal>
            <Reveal i={1}>
              <p className="lead">
                Each one is a single command. Or skip the commands and <b>ask Bob in plain English</b>.
              </p>
            </Reveal>
          </div>
          <span className="numeral" aria-hidden>
            05
          </span>
        </div>
        <div className="bento">
          {TILES.map((t, i) => (
            <Reveal key={t.n} i={i % 4} className={`tile-cell ${t.cls.replace(' hero', '')}`}>
              <a className={`tile ${t.cls.includes('hero') ? 'hero' : ''}`} href={LINKS.repo + '#everything-the-cli-does'} target="_blank" rel="noreferrer">
              <div className="tile-top">
                <span className="tile-n">{t.n}</span>
                <span className="tile-arrow" aria-hidden>
                  ↗
                </span>
              </div>
              <h3 className="h3">{t.name}</h3>
              <p className="tile-line">{t.line}</p>
              {t.demo && <div className="tile-demo">{t.demo}</div>}
              <div className="tile-cmds">
                {t.cmd.map((c) => (
                  <code key={c} className="chip">
                    {c}
                  </code>
                ))}
              </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
