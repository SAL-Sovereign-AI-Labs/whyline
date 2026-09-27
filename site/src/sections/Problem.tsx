import { Eyebrow, LitText, Reveal } from '../ui';

const PAINS = [
  {
    q: 'Why is this here?',
    a: 'Your AI writes a big share of your code, but the request behind each change lives in a chat that gets closed.',
  },
  {
    q: 'Can this go?',
    a: 'It leaves throwaway code behind: a mock "until the real API lands", a demo script, a feature flag. It ships and stays.',
  },
  {
    q: 'Did anyone look at this?',
    a: 'Nobody can say which AI-written lines a person actually looked at.',
  },
];

const css = `
.pb-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(32px, 6vw, 96px);
  align-items: end;
  margin-bottom: clamp(56px, 7vw, 100px);
}
.pb-lit {
  margin: 0;
  font-size: clamp(22px, 2.1vw, 30px);
  line-height: 1.32;
  letter-spacing: -0.025em;
  font-weight: 400;
  color: var(--ink);
}
.pb-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.pb-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 330px;
  overflow: hidden;
  transition: transform 0.5s var(--ease), border-color 0.5s var(--ease), box-shadow 0.5s var(--ease);
}
.pb-card:hover {
  transform: translateY(-6px);
  border-color: var(--ink);
  box-shadow: 0 30px 60px -36px rgba(0, 0, 0, 0.35);
}
.pb-card .numeral {
  font-size: clamp(96px, 9vw, 140px);
  transition: -webkit-text-stroke-color 0.5s var(--ease);
  margin: -6px 0 0 -6px;
}
.pb-card:hover .numeral { -webkit-text-stroke-color: var(--accent); }
.pb-card .h3 {
  margin-top: auto;
  font-size: clamp(24px, 2.2vw, 30px);
  font-weight: 300;
  letter-spacing: -0.03em;
  padding-top: 40px;
}
.pb-card .h3 q { quotes: '“' '”'; }
.pb-card .h3 q::before, .pb-card .h3 q::after { font-family: var(--serif); font-style: italic; color: var(--accent); }
.pb-card p {
  margin: 14px 0 0;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.55;
}
.pb-card .label {
  position: absolute;
  top: clamp(22px, 2.4vw, 32px);
  right: clamp(22px, 2.4vw, 32px);
  font-size: 10.5px;
}
@media (max-width: 900px) {
  .pb-head { grid-template-columns: 1fr; align-items: start; }
  .pb-grid { grid-template-columns: 1fr; }
  .pb-card { min-height: 0; }
}
`;

const TAGS = ['lost reason', 'left behind', 'never looked at'];

export function Problem() {
  return (
    <section className="section" id="problem">
      <style>{css}</style>
      <div className="wrap">
        <Eyebrow fig="01">The problem</Eyebrow>
        <div className="pb-head">
          <Reveal as="h2" className="h2">
            <strong>Git keeps the code.</strong> It loses the <span className="em">reason</span>.
          </Reveal>
          <LitText
            className="pb-lit"
            text="Your AI assistant writes a big share of your code, but the request behind each change lives in a chat that gets closed. Git keeps the code and loses the reason."
          />
        </div>
        <div className="pb-grid">
          {PAINS.map((p, i) => (
            <Reveal key={p.q} i={i} className="card pb-card">
              <span className="numeral" aria-hidden>
                0{i + 1}
              </span>
              <span className="label">{TAGS[i]}</span>
              <h3 className="h3">
                <q>{p.q}</q>
              </h3>
              <p>{p.a}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
