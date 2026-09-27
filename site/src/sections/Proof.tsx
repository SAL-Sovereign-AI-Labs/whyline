import type { ReactNode } from 'react';
import { CountUp, Ext, Eyebrow, LINKS, Reveal } from '../ui';

const STATS: { num: ReactNode; cap: ReactNode; src: string }[] = [
  { num: <CountUp to={82} />, cap: <>tests, <b>0 failing</b></>, src: 'npm test' },
  { num: <CountUp to={51} suffix="%" />, cap: <>of the demo shop written by AI <b>(49 of 96 lines)</b></>, src: 'whyline bom' },
  { num: <CountUp to={47} />, cap: <>AI lines no person has changed since</>, src: 'whyline unreviewed' },
  { num: <>0</>, cap: <>dependencies. Just Node and git.</>, src: 'package.json' },
  { num: <><CountUp to={0.2} decimals={1} /><small> s</small></>, cap: <>added per file Bob edits <b>(182 ms median)</b></>, src: 'README, Speed' },
  { num: <><CountUp to={5} ms={900} /><small>/5</small></>, cap: <>checks proven by the built-in self check</>, src: 'whyline selftest' },
];

const CSS = `
.proof-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: end; margin-bottom: clamp(44px, 5vw, 72px); }
.proof-head .numeral { margin-bottom: -8px; }
.proof-head .lead { margin: 22px 0 0; }
.proof-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--ink); border-left: 1px solid var(--line); }
.proof-cell {
  position: relative; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line);
  padding: clamp(22px, 2.4vw, 34px); min-height: 260px; display: flex; flex-direction: column; gap: 18px;
  background: transparent; transition: background .4s var(--ease);
}
.proof-cell:hover { background: var(--card); }
.proof-cell::before {
  content: ''; position: absolute; left: -1px; top: -1px; width: 9px; height: 9px;
  border-left: 1px solid var(--accent); border-top: 1px solid var(--accent);
}
.proof-idx { display: flex; justify-content: space-between; }
.proof-num { font-size: clamp(76px, 8.2vw, 128px); color: var(--ink); margin-top: 10px; white-space: nowrap; }
.proof-num small { font-family: var(--mono); font-weight: 500; font-size: .3em; color: var(--accent); letter-spacing: 0; margin-left: .15em; }
.proof-cap { flex: 1; margin: 0; font-size: 16px; line-height: 1.45; color: var(--muted); max-width: 30ch; }
.proof-cap b { color: var(--ink); font-weight: 600; }
.proof-src { font-family: var(--mono); font-size: 11.5px; color: var(--ink-2); }
.proof-src::before { content: '$ '; color: var(--accent); }
.proof-src.file::before { content: '↳ '; }
.proof-note { margin-top: 28px; display: flex; flex-wrap: nowrap; align-items: baseline; gap: 10px 20px; font-size: 16px; color: var(--muted); }
.proof-note a { color: var(--ink); font-weight: 600; text-underline-offset: 4px; text-decoration-color: var(--accent); text-decoration-thickness: 2px; }
.proof-note a:hover { color: var(--accent); }
@media (max-width: 900px) { .proof-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) {
  .proof-head { grid-template-columns: 1fr; }
  .proof-head .numeral { display: none; }
  .proof-cell { min-height: 190px; padding: 18px; gap: 12px; }
  .proof-num { font-size: 62px; }
  .proof-cap { font-size: 14px; }
}
`;

export function Proof() {
  return (
    <section className="section" id="proof" aria-labelledby="proof-h">
      <style>{CSS}</style>
      <div className="wrap">
        <Eyebrow fig="08">Proof</Eyebrow>
        <div className="proof-head">
          <div>
            <Reveal>
              <h2 className="h2" id="proof-h">
                Real numbers, <strong>from real</strong> <span className="em">runs</span>.
              </h2>
            </Reveal>
            <Reveal i={1}>
              <p className="lead">No estimates. Each number below is what a command printed.</p>
            </Reveal>
          </div>
          <span className="numeral" aria-hidden>
            08
          </span>
        </div>

        <div className="proof-grid">
          {STATS.map((s, i) => (
            <Reveal key={s.src} i={i % 3} className="proof-cell">
              <div className="proof-idx label">
                <span>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="proof-num dots">{s.num}</div>
              <p className="proof-cap">{s.cap}</p>
              <span className={`proof-src ${/[.,]/.test(s.src) ? 'file' : ''}`}>{s.src}</span>
            </Reveal>
          ))}
        </div>

        <Reveal className="proof-note">
          <span className="dot green" aria-hidden />
          <span>
            Every number comes from running the commands on this repository and the demo shop.{' '}
            <Ext href={LINKS.repo + '#check-it-yourself'}>Check them yourself in the README ↗</Ext>
          </span>
        </Reveal>
      </div>
    </section>
  );
}
