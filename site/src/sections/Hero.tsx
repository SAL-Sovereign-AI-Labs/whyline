import { useEffect, useRef, useState } from 'react';
import { Ext, LINKS, Marquee, useInView } from '../ui';

/* ---------- the "blame vs why" panel data (real demo shop files, real `whyline why` output) ---------- */

type Tok = [string, string?];
type Row = { file: string; n: number; toks: Tok[]; extra: [string, string] };

const TEMP: [string, string] = ['temporary', 'mock, waiting: still used in src/payments/checkout.py'];
const SIB: [string, string] = ['same request', 'also wrote src/payments/mock_gateway.py'];

const GW = 'src/payments/mock_gateway.py';
const CO = 'src/payments/checkout.py';

const ROWS: Row[] = [
  { file: GW, n: 1, toks: [['# TODO(payments-v2): replace with the real gateway', 'cm']], extra: TEMP },
  { file: GW, n: 2, toks: [['class ', 'kw'], ['MockGateway', 'fn'], [':']], extra: TEMP },
  { file: GW, n: 3, toks: [['    def ', 'kw'], ['charge', 'fn'], ['(self, total):']], extra: TEMP },
  { file: GW, n: 4, toks: [['        return ', 'kw'], ['True', 'bo']], extra: TEMP },
  { file: CO, n: 2, toks: [['from ', 'kw'], ['.mock_gateway '], ['import ', 'kw'], ['MockGateway', 'fn']], extra: SIB },
  { file: CO, n: 7, toks: [['    '], ['MockGateway', 'fn'], ['().charge(total)']], extra: SIB },
];

const TICKER = [
  <>
    <code>git blame</code>&nbsp;tells you who. Whyline tells you why.
  </>,
  'Every AI line keeps its request.',
  'Temporary code, with a date to go.',
  'Bob deletes only after your yes.',
  '0 Bob usage credits to record.',
  'Saved in your git history.',
  'No network calls.',
  'Your pull request check knows what should be gone.',
];

const css = `
.hx {
  position: relative;
  padding-top: clamp(120px, 11vw, 160px);
  padding-bottom: 0;
}
.hx-status {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 9px 16px 9px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--card) 70%, transparent);
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-2);
  margin-bottom: clamp(26px, 3vw, 40px);
}
.hx h1 {
  font-size: clamp(40px, 6.5vw, 96px);
  max-width: 13.4em;
  text-wrap: balance;
}
.hx h1 .em {
  padding-right: 0.04em;
}
.hx-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.86fr) minmax(0, 1fr);
  gap: clamp(40px, 5vw, 80px);
  align-items: start;
  margin-top: clamp(36px, 4vw, 60px);
}
.hx-sub {
  font-size: clamp(22px, 2.2vw, 30px);
  line-height: 1.25;
  letter-spacing: -0.025em;
  font-weight: 300;
  margin: 0 0 22px;
}
.hx-sub code {
  font-family: var(--mono);
  font-size: 0.82em;
  letter-spacing: -0.01em;
  padding: 0.08em 0.36em;
  border-radius: 8px;
  background: var(--paper-2);
  border: 1px solid var(--line);
}
.hx-sub b { font-weight: 700; }
.hx .lead { margin: 0 0 34px; font-size: clamp(17px, 1.35vw, 19px); }
.hx-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.hx-install {
  margin-top: 26px;
  display: flex;
  align-items: center;
  gap: 0;
  max-width: 100%;
  width: max-content;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  font-family: var(--mono);
  font-size: 13px;
  overflow: hidden;
}
.hx-install code {
  padding: 13px 16px;
  white-space: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  min-width: 0;
}
.hx-install code::-webkit-scrollbar { display: none; }
.hx-install code .p { color: var(--accent); }
.hx-copy {
  flex: none;
  align-self: stretch;
  border: 0;
  border-left: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0 16px;
  min-width: 84px;
  cursor: pointer;
  transition: background 0.25s var(--ease), color 0.25s var(--ease);
}
.hx-copy:hover { background: var(--ink); color: var(--paper); }
.hx-copy.ok { color: var(--pass); }
.hx-copy.ok:hover { color: var(--paper); }
.hx button:focus-visible, .hx a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

.hx-head { position: relative; }
.hx-spec {
  list-style: none;
  margin: 44px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, auto);
  justify-content: start;
  border-top: 1px solid var(--line);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.hx-spec li { padding: 16px 22px 0 0; margin-right: 22px; border-right: 1px solid var(--line); line-height: 1.5; }
.hx-spec li:last-child { border-right: 0; margin-right: 0; }
.hx-spec b { display: block; font-family: var(--dots); font-weight: 900; font-size: 34px; letter-spacing: -0.02em; color: var(--ink); line-height: 1; margin-bottom: 6px; text-transform: none; }
.hx-badge {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 136px;
  height: 136px;
  color: var(--ink);
  pointer-events: none;
}
.hx-badge svg { width: 100%; height: 100%; animation: hx-spin 20s linear infinite; }
.hx-badge text { font-family: var(--mono); font-size: 8.6px; font-weight: 500; fill: currentColor; }
.hx-badge i {
  position: absolute;
  inset: 50% auto auto 50%;
  width: 42px; height: 42px;
  margin: -21px 0 0 -21px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: grid; place-items: center;
  font-family: var(--serif);
  font-size: 26px;
  padding-bottom: 4px;
}
@keyframes hx-spin { to { transform: rotate(360deg); } }

/* ---- the panel ---- */
.hx-panel { position: relative; }
.hx-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.hx-tag b { color: var(--accent); font-weight: 500; }
.hx-code { font-size: 13px; }
.hx-code .term-bar span:last-child { margin-left: auto; color: #6f6b63; }
.hx-body { padding: 10px 0 52px; }
.hx-file {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 18px 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #8f8b82;
}
.hx-file::after { content: ''; flex: 1; height: 1px; background: #2c2b29; }
.hx-row {
  all: unset;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 172px 30px minmax(0, 1fr);
  align-items: center;
  width: 100%;
  padding: 3px 18px 3px 0;
  cursor: pointer;
  white-space: pre;
  position: relative;
  transition: background 0.3s var(--ease);
}
.hx-row::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--accent);
  transform: scaleY(0);
  transition: transform 0.35s var(--ease);
}
.hx-row:hover { background: rgba(255, 255, 255, 0.03); }
.hx-row.on { background: rgba(255, 90, 31, 0.11); }
.hx-row.on::before { transform: none; }
.hx-row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.hx-blame {
  padding-left: 18px;
  color: #6f6b63;
  font-size: 11.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 1px solid #2c2b29;
  margin-right: 12px;
  transition: color 0.3s var(--ease);
}
.hx-row.on .hx-blame { color: #d9d5cc; }
.hx-blame .s { display: none; }
.hx-ln { color: #56534d; text-align: right; padding-right: 12px; }
.hx-row.on .hx-ln { color: var(--accent); }
.hx-src { overflow: hidden; text-overflow: ellipsis; color: #e9e6df; }
.hx-src .kw { color: #ff8a5c; }
.hx-src .fn { color: #fff; font-weight: 700; }
.hx-src .cm { color: #8f8b82; font-style: italic; }
.hx-src .bo { color: #ffd166; }

/* ---- flip card ---- */
.hx-card {
  position: relative;
  margin: -34px 0 0 clamp(0px, 4vw, 56px);
  perspective: 1400px;
  z-index: 2;
}
.hx-flip {
  display: grid;
  transform-style: preserve-3d;
  transition: transform 0.8s var(--ease);
}
.hx-card[data-phase='why'] .hx-flip { transform: rotateX(180deg); }
.hx-face {
  grid-area: 1 / 1;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 16px;
  padding: 18px 20px 20px;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.55;
  box-shadow: 0 30px 70px -28px rgba(0, 0, 0, 0.35);
}
.hx-face.who {
  background: var(--card);
  border: 1px solid var(--line);
  color: var(--ink-2);
}
.hx-face.why {
  background: #fff;
  border: 1px solid var(--accent);
  transform: rotateX(180deg);
  color: var(--ink);
  box-shadow: 0 30px 70px -28px rgba(255, 90, 31, 0.45);
}
.hx-face header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px dashed var(--line);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.hx-face header b { color: var(--ink); font-weight: 700; }
.hx-face.why header b { color: var(--accent); }
.hx-face header span { text-transform: none; letter-spacing: 0; margin-left: auto; }
.hx-kv { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 5px 14px; margin: 0; }
.hx-kv dt { color: var(--muted); }
.hx-kv dd { margin: 0; }
.hx-big {
  font-family: var(--sans);
  font-size: clamp(22px, 2vw, 28px);
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin: 2px 0 14px;
}
.hx-big .em { font-size: 1.12em; }
.hx-q { color: var(--ink); font-weight: 500; }
.hx-q mark { background: var(--accent-soft); color: var(--accent-ink); padding: 0 3px; border-radius: 3px; }
.hx-unknown { color: var(--fail); }
.hx-steps {
  display: flex;
  gap: 18px;
  margin: 16px 0 0 clamp(0px, 4vw, 56px);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--faint);
}
.hx-steps span { display: inline-flex; align-items: center; gap: 8px; transition: color 0.3s var(--ease); }
.hx-steps span::before { content: ''; width: 18px; height: 2px; background: currentColor; }
.hx-steps .on { color: var(--ink); }
.hx-steps .on.w { color: var(--accent); }

/* ---- ticker ---- */
.hx-ticker {
  margin-top: clamp(80px, 9vw, 130px);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding: 20px 0;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-2);
  position: relative;
  z-index: 1;
  background: var(--paper);
}
.hx-ticker code { font-family: inherit; color: var(--accent); }

@media (max-width: 980px) {
  .hx-grid { grid-template-columns: minmax(0, 1fr); }
  .hx-badge { width: 100px; height: 100px; }
}
@media (max-width: 560px) {
  .hx-status { font-size: 10px; letter-spacing: 0.08em; padding: 8px 12px; gap: 10px; }
  .hx-code { font-size: 11.5px; }
  .hx-row { grid-template-columns: 80px 22px minmax(0, 1fr); padding-right: 12px; }
  .hx-blame .l { display: none; }
  .hx-blame .s { display: inline; }
  .hx-tag > span:last-child { display: none; }
  .hx-body { padding-bottom: 40px; }
  .hx-blame { padding-left: 12px; margin-right: 8px; font-size: 10.5px; }
  .hx-ln { padding-right: 8px; }
  .hx-file { padding-inline: 12px; }
  .hx-card { margin: -24px 8px 0; }
  .hx-steps { margin-left: 8px; }
  .hx-face { padding: 16px; font-size: 12px; }
  .hx-kv { grid-template-columns: 1fr; gap: 0; }
  .hx-kv dd { margin-bottom: 8px; }
  .hx-ctas .btn { flex: 1 1 auto; justify-content: center; }
  .hx-badge { display: none; }
  .hx-spec li { padding-right: 12px; margin-right: 12px; font-size: 10px; letter-spacing: 0.08em; }
  .hx-spec b { font-size: 28px; }
  .hx-install { width: 100%; }
  .hx-code .term-bar span:last-child { display: none; }
}
`;

function useReduced() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function CopyInstall() {
  const [ok, setOk] = useState(false);
  const t = useRef<number | undefined>(undefined);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(LINKS.install);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = LINKS.install;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setOk(true);
    clearTimeout(t.current);
    t.current = window.setTimeout(() => setOk(false), 1800);
  };
  return (
    <div className="hx-install">
      <code>
        <span className="p">$ </span>
        {LINKS.install}
      </code>
      <button type="button" className={`hx-copy ${ok ? 'ok' : ''}`} onClick={copy} aria-label="Copy the install command">
        {ok ? 'Copied' : 'Copy'}
      </button>
      <span className="sr-only" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {ok ? 'Copied' : ''}
      </span>
    </div>
  );
}

function BlameVsWhy() {
  const reduce = useReduced();
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, margin: '0px' });
  const [active, setActive] = useState(2);
  const [phase, setPhase] = useState<'who' | 'why'>(reduce ? 'why' : 'who');
  const [held, setHeld] = useState(false);
  const row = ROWS[active];

  // Pick a line: show what git blame knows first, then flip to what Whyline knows.
  const pick = (i: number) => {
    setActive(i);
    if (reduce) return setPhase('why');
    setPhase('who');
  };

  useEffect(() => {
    if (reduce || phase !== 'who') return;
    const id = setTimeout(() => setPhase('why'), held ? 650 : 1300);
    return () => clearTimeout(id);
  }, [phase, active, held, reduce]);

  // Idle: step to the next line every few seconds while on screen.
  useEffect(() => {
    if (reduce || held || !inView || phase !== 'why') return;
    const id = setTimeout(() => pick((active + 1) % ROWS.length), 3000);
    return () => clearTimeout(id);
  }, [phase, active, held, inView, reduce]);

  const ref2 = `${row.file}:${row.n}`;
  let lastFile = '';

  return (
    <div
      className="hx-panel"
      ref={ref}
      onMouseLeave={() => setHeld(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setHeld(false);
      }}
    >
      <div className="hx-tag">
        <span>
          <b>Try it</b> // hover or tap a line
        </span>
        <span aria-hidden>who → why</span>
      </div>
      <div className="term hx-code">
        <div className="term-bar">
          <i />
          <i />
          <i />
          <span>demo shop</span>
          <span>git blame vs whyline why</span>
        </div>
        <div className="hx-body" role="group" aria-label="Code written by IBM Bob. Pick a line to see who wrote it and why.">
          {ROWS.map((r, i) => {
            const head = r.file !== lastFile;
            lastFile = r.file;
            return (
              <div key={i}>
                {head && <div className="hx-file">{r.file}</div>}
                <button
                  type="button"
                  className={`hx-row ${i === active ? 'on' : ''}`}
                  aria-pressed={i === active}
                  aria-label={`${r.file} line ${r.n}: show who wrote it and why`}
                  onMouseEnter={() => {
                    setHeld(true);
                    if (i !== active) pick(i);
                  }}
                  onFocus={() => {
                    setHeld(true);
                    if (i !== active) pick(i);
                  }}
                  onClick={() => {
                    setHeld(true);
                    pick(i);
                  }}
                >
                  <span className="hx-blame">
                    <span className="l">demo · 3 weeks ago</span>
                    <span className="s">demo · 3w</span>
                  </span>
                  <span className="hx-ln">{r.n}</span>
                  <span className="hx-src">
                    {r.toks.map(([t, c], k) => (
                      <span key={k} className={c}>
                        {t}
                      </span>
                    ))}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="hx-card" data-phase={phase} aria-live="polite">
        <div className="hx-flip">
          <div className="hx-face who" aria-hidden={phase !== 'who'}>
            <header>
              <b>$ git blame</b>
              <span>{ref2}</span>
            </header>
            <p className="hx-big">
              who: <strong>demo</strong>, 3 weeks ago.
            </p>
            <dl className="hx-kv">
              <dt>written by</dt>
              <dd>a person? an AI? can't tell</dd>
              <dt>request</dt>
              <dd className="hx-unknown">lost when the chat closed</dd>
              <dt>temporary?</dt>
              <dd className="hx-unknown">no idea</dd>
              <dt>can go</dt>
              <dd className="hx-unknown">ask around and hope</dd>
            </dl>
          </div>
          <div className="hx-face why" aria-hidden={phase !== 'why'}>
            <header>
              <b>$ whyline why</b>
              <span>{ref2}</span>
            </header>
            <p className="hx-big">
              why: <span className="em">the request.</span>
            </p>
            <dl className="hx-kv">
              <dt>written by</dt>
              <dd>AI (IBM Bob)</dd>
              <dt>request</dt>
              <dd className="hx-q">
                "Add a mock payment gateway ... so the checkout demo works <mark>until payments-v2 lands</mark>."
              </dd>
              <dt>{row.extra[0]}</dt>
              <dd>{row.extra[1]}</dd>
              <dt>can go</dt>
              <dd>when nothing uses MockGateway any more</dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="hx-steps" aria-hidden>
        <span className={phase === 'who' ? 'on' : ''}>git blame: who</span>
        <span className={phase === 'why' ? 'on w' : ''}>Whyline: why</span>
      </div>
    </div>
  );
}

function SpinBadge() {
  return (
    <div className="hx-badge" aria-hidden>
      <svg viewBox="0 0 120 120">
        <defs>
          <path id="hx-circle" d="M60,60 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" />
        </defs>
        <text>
          <textPath href="#hx-circle" textLength="292" lengthAdjust="spacing">
            WHY · EVERY · LINE · KEPT · WHY · EVERY · LINE · KEPT ·
          </textPath>
        </text>
      </svg>
      <i>w</i>
    </div>
  );
}

export function Hero() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const r = (i: number, cls = '') => ({ className: `reveal ${ready ? 'in' : ''} ${cls}`, style: { ['--i' as string]: i } });

  return (
    <section className="hx" id="top">
      <style>{css}</style>
      <div className="wrap">
        <div {...r(0)}>
          <span className="hx-status">
            <span className="dot" />
            Works with IBM Bob, IBM's AI coding assistant
          </span>
        </div>
<div className="hx-head">
        <h1 {...r(1, 'display')}>
          Know <span className="em">why</span> your AI wrote <strong>every line</strong>, and clean up what it <strong>left behind</strong>.
        </h1>
          <SpinBadge />
        </div>

        <div className="hx-grid">
          <div {...r(3, 'hx-left')}>
            <p className="hx-sub">
              <code>git blame</code> tells you who. <b>Whyline tells you why.</b>
            </p>
            <p className="lead">
              Whyline saves the request behind every line IBM Bob writes, right in your git history, and tells you when its temporary code is safe to
              delete.
            </p>
            <div className="hx-ctas">
              <a className="btn btn-primary" href={LINKS.report}>
                See the live report <span className="arrow">→</span>
              </a>
              <Ext className="btn btn-ghost" href={LINKS.repo}>
                View on GitHub <span className="arrow">↗</span>
              </Ext>
            </div>
            <CopyInstall />
            <ul className="hx-spec" aria-label="Facts">
              <li>
                <b>0</b> dependencies
              </li>
              <li>
                <b>0</b> network calls
              </li>
              <li>
                <b>182ms</b> median per file Bob edits
              </li>
            </ul>
          </div>
          <div {...r(4)}>
            <BlameVsWhy />
          </div>
        </div>
      </div>

      <div className="hx-ticker" aria-label="Whyline in short">
        <Marquee items={TICKER} speed={60} />
      </div>
    </section>
  );
}
