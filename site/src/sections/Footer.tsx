import { Ext, LINKS, Reveal } from '../ui';

const FOOT_LINKS = [
  { label: 'GitHub', href: LINKS.repo, ext: true },
  { label: 'npm', href: LINKS.npm, ext: true },
  { label: 'Live report', href: LINKS.report, ext: false },
  { label: 'Demo shop', href: LINKS.shop, ext: true },
  { label: 'Architecture diagrams', href: LINKS.repo + '/tree/main/architecture', ext: true },
];

const css = `
.ft {
  position: relative;
  border-top: 1px solid var(--line);
  padding-top: clamp(96px, 12vw, 168px);
  overflow: hidden;
}
.ft-top {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: clamp(40px, 6vw, 96px);
  align-items: start;
}
.ft-title { font-size: clamp(44px, 12.5vw, 184px); margin-bottom: clamp(40px, 5vw, 72px); }
.ft-title .em { padding-right: 0.06em; }
.ft-tag {
  margin: 0;
  max-width: 440px;
  font-size: clamp(22px, 2.2vw, 30px);
  line-height: 1.25;
  letter-spacing: -0.025em;
  font-weight: 300;
}
.ft-tag b { font-weight: 700; }
.ft-tag code {
  font-size: 0.82em;
  padding: 0.08em 0.36em;
  border-radius: 8px;
  background: var(--paper-2);
  border: 1px solid var(--line);
}
.ft-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid var(--line);
}
.ft-links li { border-bottom: 1px solid var(--line); }
.ft-links li:nth-child(odd) { border-right: 1px solid var(--line); }
.ft-links li:last-child:nth-child(odd) { grid-column: 1 / -1; border-right: 0; }
.ft-links a {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--ink);
  transition: background 0.3s var(--ease), color 0.3s var(--ease), padding 0.3s var(--ease);
}
.ft-links a span { color: var(--accent); transition: transform 0.3s var(--ease); }
.ft-links a:hover { background: var(--ink); color: var(--paper); padding-left: 22px; }
.ft-links a:hover span { transform: translate(3px, -3px); }
.ft-links a:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.ft-meta {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-top: clamp(64px, 8vw, 110px);
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.ft-meta .dot { margin-right: 10px; vertical-align: 1px; }
.ft-word {
  margin-top: clamp(24px, 3vw, 40px);
  font-family: var(--sans);
  font-weight: 800;
  font-size: 23.2vw;
  line-height: 0.74;
  letter-spacing: -0.065em;
  color: transparent;
  -webkit-text-stroke: 1.2px var(--line);
  text-align: center;
  white-space: nowrap;
  user-select: none;
  margin-bottom: -0.06em;
  transform: translateX(-0.03em);
}
@media (max-width: 900px) {
  .ft-top { grid-template-columns: 1fr; align-items: start; }
}
@media (max-width: 480px) {
  .ft-links { grid-template-columns: 1fr; }
  .ft-links li:nth-child(odd) { border-right: 0; }
  .ft-word { -webkit-text-stroke: 1px var(--faint); opacity: 0.6; }
}
`;

export function Footer() {
  return (
    <footer className="ft">
      <style>{css}</style>
      <div className="wrap">
        <Reveal as="h2" className="display ft-title">
          Keep the <span className="em">why</span>.
        </Reveal>
        <div className="ft-top">
          <Reveal i={1}>
            <p className="ft-tag">
              <code>git blame</code> tells you who. <b>Whyline tells you why.</b>
            </p>
          </Reveal>
          <Reveal i={2}>
            <nav aria-label="Footer">
              <ul className="ft-links">
                {FOOT_LINKS.map((l) => (
                  <li key={l.label}>
                    {l.ext ? (
                      <Ext href={l.href}>
                        {l.label} <span aria-hidden>↗</span>
                      </Ext>
                    ) : (
                      <a href={l.href}>
                        {l.label} <span aria-hidden>→</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </Reveal>
        </div>
        <div className="ft-meta label">
          <span>
            <span className="dot" />
            MIT licensed · Built for the IBM Bob 2.0 Hackathon, 25 to 27 Sep 2026
          </span>
          <a href="#top" style={{ textDecoration: 'none' }}>
            Back to top ↑
          </a>
        </div>
      </div>
      <div className="ft-word" aria-hidden>
        WHYLINE
      </div>
    </footer>
  );
}
