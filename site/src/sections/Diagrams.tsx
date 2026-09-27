import { useState } from 'react';
import { Flow } from '@flow';
import editor from '@figures/whyline-1-editor.ts';
import team from '@figures/whyline-2-team.ts';
import { Eyebrow, Reveal } from '../ui';

// The real interactive architecture diagrams from architecture/, the same source as the README GIFs.

const FIGS = [
  { id: 'editor', label: 'In your editor', fig: editor },
  { id: 'team', label: 'Across the team', fig: team },
] as const;

const THEME = {
  accent: '#ff5a1f',
  fg: '#0c0c0d',
  muted: '#6b6860',
  bg: '#f6f5f1',
  surface: '#ecebe6',
  border: '#cfccc3',
  font: "'Manrope', sans-serif",
};

export function Diagrams() {
  const [choice, setChoice] = useState<(typeof FIGS)[number]['id']>('editor');
  const cur = FIGS.find((f) => f.id === choice)!;
  return (
    <section className="section" id="diagrams">
      <style>{CSS}</style>
      <div className="wrap">
        <Reveal>
          <Eyebrow fig="04">The real architecture</Eyebrow>
        </Reveal>
        <div className="dg-head">
          <Reveal i={1} as="h2" className="h2">
            See it <span className="em">move.</span>
          </Reveal>
          <Reveal i={2} className="dg-tabs" as="div">
            <div role="tablist" aria-label="Choose a diagram" className="dg-pills">
              {FIGS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={choice === f.id}
                  className={`dg-pill ${choice === f.id ? 'on' : ''}`}
                  onClick={() => setChoice(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal i={3} className="dg-frame">
          <div className="dg-corner label" aria-hidden>
            <span className="dot" /> {cur.fig.title}
          </div>
          <div className="dg-flow" role="tabpanel">
            <Flow key={choice} {...cur.fig.props} theme={THEME} />
          </div>
        </Reveal>
        <p className="label dg-note">The real diagrams. Click a step, hover a box, change the speed.</p>
        <p className="label dg-phone">On a phone, swipe the diagram sideways or open it full screen.</p>
      </div>
    </section>
  );
}

const CSS = `
.dg-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; flex-wrap: wrap; margin-bottom: clamp(32px, 4vw, 52px); }
.dg-pills { display: inline-flex; gap: 4px; padding: 4px; border: 1px solid var(--line); border-radius: 999px; background: var(--card); }
.dg-pill {
  font-family: var(--mono); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;
  border: 0; border-radius: 999px; padding: 11px 18px; cursor: pointer;
  background: transparent; color: var(--muted);
  transition: background 0.3s var(--ease), color 0.3s var(--ease);
}
.dg-pill:hover { color: var(--ink); }
.dg-pill.on { background: var(--ink); color: var(--paper); }
.dg-pill:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dg-frame { position: relative; }
.dg-corner { display: flex; align-items: center; gap: 10px; font-size: 11px; margin-bottom: 14px; }
.dg-flow { min-width: 0; }
.dg-note { margin: 18px 0 0; text-align: center; }
.dg-phone { display: none; margin: 8px 0 0; text-align: center; font-size: 11px; color: var(--faint); }
@media (max-width: 600px) {
  .dg-phone { display: block; }
  .dg-pills { width: 100%; }
  .dg-pill { flex: 1; padding: 11px 8px; letter-spacing: 0.06em; }
  .dg-tabs { width: 100%; }
}
`;
