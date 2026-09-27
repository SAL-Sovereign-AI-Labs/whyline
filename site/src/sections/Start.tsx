import { useState } from 'react';
import { Ext, Eyebrow, LINKS, Reveal, Terminal, type TermLine } from '../ui';

const CMDS = [LINKS.install, 'whyline init', 'git add .bob && git commit -m "add whyline"'];

const LINES: TermLine[] = [
  { t: 'out', text: '# 1. install, once per machine', tone: 'c' },
  { t: 'cmd', text: CMDS[0] },
  { t: 'out', text: '' },
  { t: 'out', text: '# 2. turn it on in your repository', tone: 'c' },
  { t: 'cmd', text: CMDS[1] },
  { t: 'out', text: 'Whyline is set up. Files written:', tone: 'g' },
  { t: 'out', text: '  .bob/settings.json (IBM Bob)' },
  { t: 'out', text: '  .bob/hooks/whyline-guard.sh (IBM Bob)' },
  { t: 'out', text: '  .bob/skills/whyline-why/SKILL.md (IBM Bob)' },
  { t: 'out', text: '  ...and 5 more skills, 3 git hooks', tone: 'c' },
  { t: 'out', text: '' },
  { t: 'out', text: '# 3. share it with your team', tone: 'c' },
  { t: 'cmd', text: CMDS[2] },
];

const STEPS = [
  { n: '01', t: 'Install', d: 'One command, from npm. No account, no key.' },
  { n: '02', t: 'Turn it on', d: 'Adds the Bob scripts and skills to your repository.' },
  { n: '03', t: 'Commit it', d: 'Everyone who pulls gets Whyline too.' },
];

const CSS = `
.start-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: clamp(32px, 5vw, 80px); align-items: start; }
.start-grid .h2 { margin-bottom: 30px; font-size: clamp(38px, 4.4vw, 64px); }
.start-steps { list-style: none; margin: 0 0 30px; padding: 0; border-top: 1px solid var(--line); }
.start-steps li { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 8px 14px; padding: 16px 0; border-bottom: 1px solid var(--line); }
.start-steps .n { font-family: var(--mono); font-size: 12px; color: var(--accent); padding-top: 4px; }
.start-steps b { font-weight: 600; font-size: 18px; }
.start-steps p { grid-column: 2; margin: -6px 0 0; color: var(--muted); font-size: 15.5px; }
.start-then { font-size: clamp(20px, 1.8vw, 24px); font-weight: 300; letter-spacing: -0.02em; line-height: 1.35; margin: 0 0 30px; }
.start-then strong { font-weight: 700; }
.start-cta { display: flex; flex-wrap: wrap; gap: 12px; }
.start-cta .btn-primary { height: 60px; padding: 0 30px; font-size: 14px; }
.start-term-wrap { position: relative; }
.start-term-wrap .term { font-size: 13.5px; }
.start-copy {
  position: absolute; top: 7px; right: 10px; z-index: 2;
  font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
  background: #232321; color: #e9e6df; border: 1px solid #3a3936; border-radius: 99px; padding: 6px 13px; cursor: pointer;
  transition: background .3s var(--ease), color .3s var(--ease), border-color .3s var(--ease);
}
.start-copy:hover { background: var(--accent); border-color: var(--accent); color: #fff; }
.start-copy:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.start-copy.ok { color: #4ade80; border-color: #2f6b45; }
@media (max-width: 960px) { .start-grid { grid-template-columns: 1fr; } }
@media (max-width: 680px) {
  .start-term-wrap .term { font-size: 11.5px; }
  .start-cta .btn { width: 100%; justify-content: center; }
}
`;

export function Start() {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    const text = CMDS.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setOk(true);
    setTimeout(() => setOk(false), 1800);
  };
  return (
    <section className="section" id="start" aria-labelledby="start-h">
      <style>{CSS}</style>
      <div className="wrap">
        <Eyebrow fig="10">Get started</Eyebrow>
        <div className="start-grid">
          <div>
            <Reveal>
              <h2 className="h2" id="start-h">
                Get started in <strong>three</strong> <span className="em">commands</span>.
              </h2>
            </Reveal>
            <Reveal i={1}>
              <ol className="start-steps">
                {STEPS.map((s) => (
                  <li key={s.n}>
                    <span className="n">{s.n}</span>
                    <b>{s.t}</b>
                    <p>{s.d}</p>
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal i={2}>
              <p className="start-then">
                Then work in Bob as usual. <strong>Nothing new to type.</strong>
              </p>
            </Reveal>
            <Reveal i={3} className="start-cta">
              <Ext href={LINKS.repo} className="btn btn-primary">
                Get Whyline on GitHub <span className="arrow">→</span>
              </Ext>
              <Ext href={LINKS.npm} className="btn btn-ghost">
                npm
              </Ext>
            </Reveal>
          </div>
          <Reveal i={1} className="start-term-wrap">
            <button type="button" className={`start-copy ${ok ? 'ok' : ''}`} onClick={copy} aria-label="Copy all three commands">
              {ok ? 'Copied' : 'Copy all'}
            </button>
            <Terminal lines={LINES} title="your repository" speed={20} minHeight={360} />
            <span className="sr-only" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              {ok ? 'Copied' : ''}
            </span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
