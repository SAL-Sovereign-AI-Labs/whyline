import { useEffect, useState } from 'react';
import { Eyebrow, Reveal, Terminal, useInView, type TermLine } from '../ui';

const HOOKS = [
  { when: 'When you send a request', what: 'saves the request, word for word' },
  { when: 'After Bob edits a file', what: 'saves the exact lines Bob wrote' },
  { when: 'When a Bob chat starts', what: 'tells Bob what is ready to delete' },
  { when: 'Before Bob runs a command', what: 'blocks commands that would rewrite or delete the history' },
];

const SKILLS = ['why', 'check', 'decide', 'remove', 'status', 'setup'];
const STEPS = ['proof', 'tests', 'your yes', 'commit'];

const GUARD: TermLine[] = [
  { t: 'cmd', text: 'git update-ref -d refs/notes/whyline' },
  {
    t: 'out',
    text: 'whyline: blocked. Bob cannot edit the history Whyline keeps (refs/notes/whyline, saved in git), and this command would delete it.',
    tone: 'r',
  },
];

function Steps() {
  const [ref, inView] = useInView<HTMLOListElement>();
  const [at, setAt] = useState(-1);
  useEffect(() => {
    if (!inView) return;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return setAt(STEPS.length - 1);
    let k = 0;
    setAt(0);
    const id = setInterval(() => {
      k = (k + 1) % 6; // 4 steps, hold on the last one, then a short blank beat
      setAt(k < 4 ? k : k === 4 ? 3 : -1);
    }, 900);
    return () => clearInterval(id);
  }, [inView]);
  return (
    <ol ref={ref} className="bob-steps" aria-label="How Bob deletes temporary code">
      {STEPS.map((s, i) => (
        <li key={s} className={i <= at ? 'on' : ''}>
          <span className="mono">{String(i + 1).padStart(2, '0')}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

const CSS = `
.bob-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: end; margin-bottom: clamp(44px, 5vw, 76px); }
.bob-head .lead { margin: 22px 0 0; }
.bob-head .numeral { -webkit-text-stroke-color: #34332f; margin-bottom: -8px; }
.bob-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
.bob-grid > * { min-width: 0; display: flex; }
.bob-grid > * > .card { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.bob-zero { grid-column: span 5; }
.bob-hooks { grid-column: span 7; }
.bob-skills, .bob-flow, .bob-guard { grid-column: span 4; }
.bob-zero .card {
  background: var(--accent); border-color: var(--accent); color: #140700; justify-content: space-between;
  position: relative; overflow: hidden;
}
.bob-zero .label { color: rgba(20,7,0,.7); }
.bob-zero .big { font-size: clamp(170px, 20vw, 290px); line-height: .78; color: #140700; margin: 10px 0 0 -6px; }
.bob-zero .big-cap { font-size: clamp(22px, 2.2vw, 30px); font-weight: 300; letter-spacing: -0.03em; line-height: 1.15; margin: 0; }
.bob-zero .big-cap strong { font-weight: 700; }
.bob-zero p.small { margin: 0; font-size: 15px; color: rgba(20,7,0,.78); }
.bob-card-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.bob-card-top .tag { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); border: 1px solid rgba(255,90,31,.4); padding: 3px 9px; border-radius: 99px; white-space: nowrap; }
.bob-grid .h3 { color: #fff; }
.bob-grid p.body { margin: 0; color: var(--muted); font-size: 16px; line-height: 1.55; }
.bob-hook-list { list-style: none; margin: 6px 0 0; padding: 0; border-top: 1px solid var(--line); }
.bob-hook-list li { display: grid; grid-template-columns: 34px minmax(0, 1fr) minmax(0, 1.1fr); gap: 14px; align-items: baseline; padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 16px; }
.bob-hook-list .n { font-family: var(--mono); font-size: 12px; color: var(--accent); }
.bob-hook-list b { font-weight: 600; color: #fff; }
.bob-hook-list span.w { color: var(--muted); font-size: 15px; }
.bob-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.bob-pills code { font-family: var(--mono); font-size: 13px; padding: 7px 13px; border-radius: 99px; border: 1px solid var(--line); color: #fff; background: #151514; transition: border-color .3s var(--ease), color .3s var(--ease); }
.bob-pills code:hover { border-color: var(--accent); color: var(--accent); }
.bob-say { margin-top: auto; font-family: var(--serif); font-style: italic; font-size: 22px; line-height: 1.3; color: #fff; border-left: 2px solid var(--accent); padding-left: 14px; }
.bob-say small { display: block; font-family: var(--mono); font-style: normal; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin-top: 6px; }
.bob-steps { list-style: none; margin: auto 0 0; padding: 0; display: grid; gap: 8px; }
.bob-steps li {
  display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--line);
  font-size: 16px; font-weight: 600; color: var(--muted); transition: all .45s var(--ease); position: relative;
}
.bob-steps li .mono { font-size: 11px; font-weight: 500; color: var(--faint); }
.bob-steps li.on { color: #fff; border-color: rgba(255,90,31,.55); background: rgba(255,90,31,.08); }
.bob-steps li.on .mono { color: var(--accent); }
.bob-steps li:nth-child(3).on { background: var(--accent); border-color: var(--accent); color: #140700; }
.bob-steps li:nth-child(3).on .mono { color: #140700; }
.bob-guard .term { margin-top: auto; box-shadow: none; font-size: 12.5px; }
.bob-guard .term-body { padding: 14px 16px 16px; }
.bob-foot { margin-top: 36px; display: flex; gap: 16px; align-items: baseline; }
.bob-foot p { margin: 0; color: var(--muted); font-size: 15px; }
.bob-foot b { color: #fff; font-weight: 600; }
@media (max-width: 1080px) {
  .bob-zero, .bob-hooks { grid-column: span 12; }
  .bob-skills, .bob-flow { grid-column: span 6; }
  .bob-guard { grid-column: span 12; }
}
@media (max-width: 680px) {
  .bob-head { grid-template-columns: 1fr; }
  .bob-head .numeral { display: none; }
  .bob-skills, .bob-flow { grid-column: span 12; }
  .bob-hook-list li { grid-template-columns: 28px minmax(0, 1fr); }
  .bob-hook-list span.w { grid-column: 2; margin-top: -8px; }
}
`;

export function Bob() {
  return (
    <section className="section dark" id="bob" aria-labelledby="bob-h">
      <style>{CSS}</style>
      <div className="wrap">
        <Eyebrow fig="06">Built for IBM Bob</Eyebrow>
        <div className="bob-head">
          <div>
            <Reveal>
              <h2 className="h2" id="bob-h">
                Bob does the <span className="em">work</span>.<br />
                <strong>Whyline remembers why.</strong>
              </h2>
            </Reveal>
            <Reveal i={1}>
              <p className="lead">
                Whyline plugs into <b>IBM Bob, IBM's AI coding assistant</b>, using parts Bob already has. You keep working the way you
                do today.
              </p>
            </Reveal>
          </div>
          <span className="numeral" aria-hidden>
            06
          </span>
        </div>

        <div className="bob-grid">
          <Reveal className="bob-zero">
            <div className="card">
              <span className="label">What recording costs you</span>
              <div>
                <div className="big dots" aria-hidden>
                  0
                </div>
                <p className="big-cap">
                  <strong>0 Bob usage credits</strong> to record.
                </p>
              </div>
              <p className="small">The scripts never call an AI. They copy what Bob already did.</p>
            </div>
          </Reveal>

          <Reveal className="bob-hooks" i={1}>
            <div className="card">
              <div className="bob-card-top">
                <h3 className="h3">4 small scripts Bob runs automatically</h3>
                <span className="tag">hooks</span>
              </div>
              <ul className="bob-hook-list">
                {HOOKS.map((h, i) => (
                  <li key={h.when}>
                    <span className="n">0{i + 1}</span>
                    <b>{h.when}</b>
                    <span className="w">{h.what}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal className="bob-skills" i={0}>
            <div className="card">
              <div className="bob-card-top">
                <h3 className="h3">Ask in plain English</h3>
                <span className="tag">6 skills</span>
              </div>
              <p className="body">Ask Bob a normal question. It runs the right whyline command and quotes the answer.</p>
              <div className="bob-pills">
                {SKILLS.map((s) => (
                  <code key={s}>{s}</code>
                ))}
              </div>
              <p className="bob-say">
                "remove the mock payment gateway"
                <small>you, to Bob</small>
              </p>
            </div>
          </Reveal>

          <Reveal className="bob-flow" i={1}>
            <div className="card">
              <div className="bob-card-top">
                <h3 className="h3">Bob's own approval prompt</h3>
                <span className="tag">deleting</span>
              </div>
              <p className="body">Nothing goes without your yes.</p>
              <Steps />
            </div>
          </Reveal>

          <Reveal className="bob-guard" i={2}>
            <div className="card">
              <div className="bob-card-top">
                <h3 className="h3">The guard</h3>
                <span className="tag">exit 2</span>
              </div>
              <p className="body">Bob cannot edit the history Whyline keeps.</p>
              <Terminal lines={GUARD} title="Bob runs a command" speed={24} />
            </div>
          </Reveal>
        </div>

        <Reveal className="bob-foot">
          <span className="dot" aria-hidden />
          <p>
            Bob helped build it: <b>19 tasks, 41.46 Bob usage credits.</b> It tested Whyline on Whyline and reported 5 issues; 3 became
            fixes.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
