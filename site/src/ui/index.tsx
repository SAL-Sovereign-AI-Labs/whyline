import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

/** Adds `.in` once the element scrolls into view. Pair with className "reveal". */
export function useInView<T extends Element>(opts: { once?: boolean; margin?: string; threshold?: number } = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (opts.once !== false) io.disconnect();
        } else if (opts.once === false) setInView(false);
      },
      { rootMargin: opts.margin ?? '0px 0px -12% 0px', threshold: opts.threshold ?? 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

/** Fades, lifts and un-blurs its child in when scrolled into view. `i` staggers siblings by 80ms. */
export function Reveal({
  children,
  i = 0,
  as: Tag = 'div',
  className = '',
  style,
}: {
  children: ReactNode;
  i?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <Tag ref={ref} className={`reveal ${inView ? 'in' : ''} ${className}`} style={{ ...style, ['--i' as string]: i }}>
      {children}
    </Tag>
  );
}

/** A paragraph whose words light up one by one as it scrolls up the screen. */
export function LitText({ text, className = '', as: Tag = 'p' }: { text: string; className?: string; as?: ElementType }) {
  const ref = useRef<HTMLElement | null>(null);
  const [lit, setLit] = useState(0);
  const words = text.split(' ');
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = innerHeight;
      // 0 when the top enters at 85% of the screen, 1 when the bottom reaches 45%.
      const p = (vh * 0.85 - r.top) / (vh * 0.85 - vh * 0.45 + r.height);
      setLit(Math.round(Math.max(0, Math.min(1, p)) * words.length));
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, [words.length]);
  return (
    <Tag ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i} className={`lit-word ${i < lit ? 'on' : ''}`}>
          {w}{' '}
        </span>
      ))}
    </Tag>
  );
}

/** Section header: FIG number + mono label + hairline, then an optional big outlined numeral. */
export function Eyebrow({ fig, children }: { fig: string; children: ReactNode }) {
  return (
    <div className="eyebrow label">
      <span className="fig">FIG {fig}</span>
      <span>//</span>
      <span>{children}</span>
    </div>
  );
}

/** A terminal line: `$ cmd` typed, then output lines. */
export type TermLine = { t: 'cmd'; text: string } | { t: 'out'; text: string; tone?: 'c' | 'g' | 'r' | 'y' | 'b' | 'p' };

/** A terminal window that types its commands and prints their output when it scrolls into view.
 *  Change `lines` (e.g. with a key) to replay. */
export function Terminal({
  title = 'zsh',
  lines,
  speed = 28,
  className = '',
  style,
  minHeight,
}: {
  title?: string;
  lines: TermLine[];
  speed?: number;
  className?: string;
  style?: CSSProperties;
  minHeight?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [shown, setShown] = useState<{ line: number; chars: number }>({ line: 0, chars: 0 });
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    setShown({ line: 0, chars: 0 });
  }, [lines]);
  useEffect(() => {
    if (!inView) return;
    if (reduce) return setShown({ line: lines.length, chars: 0 });
    if (shown.line >= lines.length) return;
    const cur = lines[shown.line];
    const id =
      cur.t === 'cmd' && shown.chars < cur.text.length
        ? setTimeout(() => setShown((s) => ({ ...s, chars: s.chars + 1 })), speed)
        : setTimeout(() => setShown((s) => ({ line: s.line + 1, chars: 0 })), cur.t === 'cmd' ? 380 : 90);
    return () => clearTimeout(id);
  }, [inView, shown, lines, speed, reduce]);
  return (
    <div ref={ref} className={`term ${className}`} style={style}>
      <div className="term-bar">
        <i />
        <i />
        <i />
        <span>{title}</span>
      </div>
      <div className="term-body" style={{ minHeight }}>
        {lines.slice(0, shown.line + 1).map((l, i) => {
          const done = i < shown.line;
          if (l.t === 'cmd') {
            const text = done ? l.text : l.text.slice(0, shown.chars);
            return (
              <div key={i}>
                <span className="p">$ </span>
                <span className="b">{text}</span>
                {!done && <span className="caret" />}
              </div>
            );
          }
          return done || i === shown.line ? (
            <div key={i} className={l.tone}>
              {l.text || ' '}
            </div>
          ) : null;
        })}
        {shown.line >= lines.length && (
          <div>
            <span className="p">$ </span>
            <span className="caret" />
          </div>
        )}
      </div>
    </div>
  );
}

/** An endless horizontal ticker. Items are duplicated so the loop is seamless. */
export function Marquee({ items, speed = 40, sep = '✦' }: { items: ReactNode[]; speed?: number; sep?: ReactNode }) {
  const row = (k: string) =>
    items.map((it, i) => (
      <span key={k + i} style={{ display: 'inline-flex', alignItems: 'center', gap: 28, paddingRight: 28 }}>
        {it}
        <span style={{ color: 'var(--accent)' }}>{sep}</span>
      </span>
    ));
  return (
    <div className="marquee">
      <div className="marquee-track" style={{ ['--speed' as string]: `${speed}s` }}>
        {row('a')}
        {row('b')}
      </div>
    </div>
  );
}

/** Counts up to `to` when scrolled into view. */
export function CountUp({ to, suffix = '', decimals = 0, ms = 1400 }: { to: number; suffix?: string; decimals?: number; ms?: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, ms]);
  return (
    <span ref={ref}>
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** External link that opens in a new tab. */
export function Ext({ href, children, className, style }: { href: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className} style={style}>
      {children}
    </a>
  );
}

export const LINKS = {
  repo: 'https://github.com/SAL-Sovereign-AI-Labs/whyline',
  report: './report/',
  npm: 'https://www.npmjs.com/package/@sal-sovereign-ai-labs/whyline',
  shop: 'https://github.com/SAL-Sovereign-AI-Labs/whyline-demo-shop',
  pr1: 'https://github.com/SAL-Sovereign-AI-Labs/whyline-demo-shop/pull/1',
  pr2: 'https://github.com/SAL-Sovereign-AI-Labs/whyline-demo-shop/pull/2',
  install: 'npm install -g @sal-sovereign-ai-labs/whyline',
};
