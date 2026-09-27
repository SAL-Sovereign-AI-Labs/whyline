import { useEffect, useState, type ReactNode } from 'react';
import { Flow, type Figure } from '../src';

// The page for judges: the idea in one screen, then the two figures, then the proof.
// Figures are picked up by file name, so this page keeps working while they are edited.
const all = import.meta.glob<{ default: Figure }>('../figures/whyline-*.ts', { eager: true });
const fig = (name: string) => Object.entries(all).find(([p]) => p.endsWith(`/${name}.ts`))?.[1].default;

const LIGHT = { bg: '#ffffff', soft: '#f5f7fa', fg: '#1c1e21', muted: '#606770', line: '#e3e6ea', accent: '#0f62fe' };
const DARK = { bg: '#161616', soft: '#212121', fg: '#e3e3e3', muted: '#9aa0a6', line: '#393939', accent: '#78a9ff' };
const FIG_DARK = { accent: '#78a9ff', fg: '#e3e3e3', muted: '#9aa0a6', bg: '#161616', surface: '#212121', border: '#393939' };
const FIG_LIGHT = { accent: '#0f62fe' };

function useDark() {
  const q = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  const [dark, setDark] = useState(q?.matches ?? false);
  useEffect(() => {
    if (!q) return;
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return [dark, setDark] as const;
}

export function Story() {
  const [dark, setDark] = useDark();
  const c = dark ? DARK : LIGHT;
  const one = fig('whyline-1-editor');
  const two = fig('whyline-2-team');

  const Section = ({ n, title, lead, children }: { n: string; title: string; lead: ReactNode; children: ReactNode }) => (
    <section style={{ marginTop: 72 }}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: c.accent }}>{n}</div>
      <h2 style={{ margin: '6px 0 8px', fontSize: 28, letterSpacing: '-.01em' }}>{title}</h2>
      <p style={{ margin: '0 0 20px', maxWidth: 760, fontSize: 16, lineHeight: 1.6, color: c.muted }}>{lead}</p>
      {children}
    </section>
  );

  const Stat = ({ big, small }: { big: string; small: string }) => (
    <div style={{ flex: '1 1 160px', padding: '18px 20px', background: c.soft, border: `1px solid ${c.line}`, borderRadius: 10 }}>
      <div style={{ fontSize: 30, fontWeight: 650, letterSpacing: '-.02em' }}>{big}</div>
      <div style={{ fontSize: 13.5, color: c.muted, marginTop: 4, lineHeight: 1.4 }}>{small}</div>
    </div>
  );

  const Link = ({ href, children }: { href: string; children: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ color: c.accent, textDecoration: 'none', padding: '6px 14px', border: `1px solid ${c.line}`, borderRadius: 999, fontSize: 14 }}
    >
      {children} ↗
    </a>
  );

  return (
    <div style={{ background: c.bg, color: c.fg, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 40px 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, color: c.muted }}>Whyline · built for IBM Bob 2.0</div>
          <button
            onClick={() => setDark(!dark)}
            style={{ background: 'none', border: `1px solid ${c.line}`, color: c.fg, borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}
          >
            {dark ? 'Light' : 'Dark'}
          </button>
        </div>

        <h1 style={{ margin: '28px 0 12px', fontSize: 'clamp(34px, 5vw, 56px)', lineHeight: 1.08, letterSpacing: '-.025em', maxWidth: 1000 }}>
          git blame tells you who.
          <br />
          <span style={{ color: c.accent }}>Whyline tells you why.</span>
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.55, color: c.muted, maxWidth: 820, margin: 0 }}>
          Every line IBM Bob writes keeps the prompt that caused it. Temporary code gets a lifecycle: recorded at birth, due when
          its condition is met, and removed by Bob with evidence and your approval.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
          <Link href="https://github.com/SAL-Sovereign-AI-Labs/whyline">GitHub repo</Link>
          <Link href="https://sal-sovereign-ai-labs.github.io/whyline/">Live dashboard</Link>
          <Link href="https://github.com/SAL-Sovereign-AI-Labs/whyline-demo-shop/pulls?q=is%3Apr">CI gate: green PR and red PR</Link>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
          <Stat big="51%" small="of the demo shop written by Bob: 49 of 96 lines, 7 sessions" />
          <Stat big="47" small="AI lines no human has edited since, listed file by file" />
          <Stat big="CI fails" small="when temporary code outlives its reason (whyline check --gate)" />
          <Stat big="0 Bobcoins" small="to record: shell hooks, no model call, 181 ms per write" />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <div style={{ flex: '3 1 520px', padding: '18px 20px', background: c.soft, border: `1px solid ${c.line}`, borderRadius: 10 }}>
            <div style={{ fontSize: 13.5, color: c.muted, marginBottom: 8 }}>Four questions a team cannot answer today</div>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 15 }}>
              <li>Why does this line exist?</li>
              <li>Which temporary code is due to go?</li>
              <li>Which AI code did nobody review?</li>
              <li>How much of this release did an agent write, and what did it cost?</li>
            </ol>
          </div>
          <div style={{ flex: '1 1 260px', padding: '18px 20px', background: c.soft, border: `1px solid ${c.line}`, borderRadius: 10 }}>
            <div style={{ fontSize: 13.5, color: c.muted, marginBottom: 8 }}>Why now</div>
            <div style={{ fontSize: 15, lineHeight: 1.6 }}>
              Pull requests merged with no review are up 31.3% (Faros 2026, 22,000 developers). The reason behind AI code disappears
              when the task ends.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            marginTop: 28,
            fontSize: 15,
          }}
        >
          <span style={{ color: c.muted, marginRight: 4 }}>How it works</span>
          {['Bob’s hooks record', 'git notes keep it', 'commands answer', 'Bob acts, you approve'].map((t, i) => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <span style={{ color: c.muted }}>→</span>}
              <span style={{ padding: '4px 12px', borderRadius: 999, border: `1px solid ${c.line}`, background: c.soft, fontWeight: 600 }}>
                {i + 1}. {t}
              </span>
            </span>
          ))}
        </div>

        <Section
          n="Part 1"
          title="In your editor"
          lead="Follow one prompt from Bob into a git note. Then ask why a line exists, and watch a mock payment gateway become due and get removed by Bob, after your yes. Pick a tab, or let it play."
        >
          {one ? <Flow key={dark ? 'd1' : 'l1'} {...one.props} theme={dark ? FIG_DARK : FIG_LIGHT} /> : <p>Figure 1 is being drawn.</p>}
        </Section>

        <Section
          n="Part 2"
          title="Across the team"
          lead="The record travels with the code. CI turns a removal condition into a gate, the dashboard answers every role, and a proposed Team tier rolls the hooks out to every developer."
        >
          {two ? <Flow key={dark ? 'd2' : 'l2'} {...two.props} theme={dark ? FIG_DARK : FIG_LIGHT} /> : <p>Figure 2 is being drawn.</p>}
        </Section>

        <Section
          n="Business"
          title="Free to record. Teams would pay for policy."
          lead="Built today and free under MIT: the CLI, the six Bob skills and the dashboard. Proposed Team tier: roll the hooks out to every developer through Bob's EnforcedHooks group policy, and keep the report as a compliance record per release, for example $20 per repository per month."
        >
          <p style={{ color: c.muted, fontSize: 14, margin: 0, maxWidth: 820, lineHeight: 1.6 }}>
            80 tests, zero runtime dependencies, no network calls. A recorded prompt shows what was asked, not that the code is
            correct: Whyline keeps the reason, reviewers still judge the code.
          </p>
        </Section>
      </div>
    </div>
  );
}
