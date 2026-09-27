import { Ext, Eyebrow, LINKS, Reveal } from '../ui';

const FREE = ['The whyline CLI', 'The Bob skills and automatic scripts', 'The one-page report', 'MIT licensed, on npm'];
const TEAM = [
  "Whyline on for every developer through Bob's organisation settings",
  'One report across all your repositories',
  "Each release's report kept as a record",
];

const CSS = `
.teams-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: end; margin-bottom: clamp(44px, 5vw, 72px); }
.teams-head .numeral { margin-bottom: -8px; }
.teams-head .lead { margin: 22px 0 0; }
.plans { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.plans > * { display: flex; min-width: 0; }
.plan { flex: 1; display: flex; flex-direction: column; gap: 22px; border-radius: var(--radius); padding: clamp(26px, 3vw, 44px); min-width: 0; }
.plan-free { background: var(--card); border: 1px solid var(--line); }
.plan-team { background: transparent; border: 1.5px dashed var(--faint); }
.plan-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.plan-badge { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; padding: 5px 11px; border-radius: 99px; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.plan-free .plan-badge { background: var(--ink); color: var(--paper); }
.plan-team .plan-badge { border: 1px solid var(--accent); color: var(--accent-ink); }
.plan-name { font-size: clamp(30px, 3vw, 40px); font-weight: 300; letter-spacing: -0.04em; margin: 0; line-height: 1; }
.plan-name strong { font-weight: 700; }
.plan-price { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.plan-price .dots { font-size: clamp(72px, 7vw, 104px); }
.plan-team .plan-price .dots { color: var(--muted); }
.plan-price .per { font-family: var(--mono); font-size: 12px; letter-spacing: .06em; color: var(--muted); padding-bottom: 12px; line-height: 1.5; }
.plan-price .per em { font-style: normal; color: var(--accent-ink); display: block; text-transform: uppercase; letter-spacing: .14em; font-size: 11px; }
.plan ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
.plan li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 10px; padding: 13px 0; border-bottom: 1px solid var(--line); font-size: 16px; line-height: 1.45; }
.plan li::before { content: '+'; font-family: var(--mono); color: var(--accent); }
.plan-team li { color: var(--ink-2); }
.plan-team li::before { content: '○'; color: var(--faint); font-size: 12px; padding-top: 3px; }
.plan .btn { margin-top: auto; align-self: flex-start; }
.teams-foot { margin-top: 22px; font-size: 14px; color: var(--muted); }
@media (max-width: 860px) { .plans { grid-template-columns: 1fr; } }
@media (max-width: 680px) {
  .teams-head { grid-template-columns: 1fr; }
  .teams-head .numeral { display: none; }
  .plan .btn { align-self: stretch; justify-content: center; }
}
`;

export function Teams() {
  return (
    <section className="section" id="teams" aria-labelledby="teams-h">
      <style>{CSS}</style>
      <div className="wrap">
        <Eyebrow fig="09">For teams</Eyebrow>
        <div className="teams-head">
          <div>
            <Reveal>
              <h2 className="h2" id="teams-h">
                Free for you. <strong>A plan</strong> for <span className="em">teams</span>.
              </h2>
            </Reveal>
            <Reveal i={1}>
              <p className="lead">Everything on this page is free and open source today. The team plan is an idea we are honest about.</p>
            </Reveal>
          </div>
          <span className="numeral" aria-hidden>
            09
          </span>
        </div>

        <div className="plans">
          <Reveal>
            <article className="plan plan-free" aria-labelledby="plan-free">
              <div className="plan-top">
                <h3 className="plan-name" id="plan-free">
                  <strong>Free</strong>
                </h3>
                <span className="plan-badge">
                  <span className="dot green" aria-hidden /> Available now
                </span>
              </div>
              <div className="plan-price">
                <span className="dots">$0</span>
                <span className="per">open source, no account</span>
              </div>
              <ul>
                {FREE.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Ext href={LINKS.npm} className="btn btn-primary">
                Get it on npm <span className="arrow">→</span>
              </Ext>
            </article>
          </Reveal>

          <Reveal i={1}>
            <article className="plan plan-team" aria-labelledby="plan-team">
              <div className="plan-top">
                <h3 className="plan-name" id="plan-team">
                  <strong>Team</strong>
                </h3>
                <span className="plan-badge">Proposed, not built</span>
              </div>
              <div className="plan-price">
                <span className="dots">$20</span>
                <span className="per">
                  <em>Example price</em>
                  per repository per month
                </span>
              </div>
              <ul>
                {TEAM.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Ext href={LINKS.repo + '/issues'} className="btn btn-ghost">
                Talk to us about Team <span className="arrow">→</span>
              </Ext>
            </article>
          </Reveal>
        </div>
        <p className="teams-foot mono">Whyline adds no Bob usage cost. Each developer keeps their own Bob seat.</p>
      </div>
    </section>
  );
}
