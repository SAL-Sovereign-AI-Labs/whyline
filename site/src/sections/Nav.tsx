import { useEffect, useState } from 'react';

const LINKS_NAV = [
  { href: '#problem', label: 'Problem' },
  { href: '#story', label: 'Story' },
  { href: '#how', label: 'How it works' },
  { href: '#bob', label: 'IBM Bob' },
  { href: '#faq', label: 'FAQ' },
];

const css = `
.nv {
  position: fixed;
  top: 16px;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: center;
  padding-inline: 12px;
  pointer-events: none;
  transition: transform 0.6s var(--ease), opacity 0.4s var(--ease);
}
.nv.hide {
  transform: translateY(-140%);
  opacity: 0;
}
.nv-pill {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 6px 6px 8px;
  border-radius: 999px;
  background: rgba(20, 20, 19, 0.86);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 50px -20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: #f1efe9;
}
.nv-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 14px 4px 4px;
  text-decoration: none;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.02em;
  border-radius: 999px;
}
.nv-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-family: var(--serif);
  font-style: italic;
  font-size: 22px;
  line-height: 1;
  padding-bottom: 3px;
  transition: transform 0.5s var(--ease);
}
.nv-logo:hover .nv-mark {
  transform: rotate(-14deg) scale(1.06);
}
.nv-links {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-inline: 6px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}
.nv-links a {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-decoration: none;
  color: #b9b5ab;
  padding: 10px 12px;
  border-radius: 999px;
  transition: color 0.25s var(--ease), background 0.25s var(--ease);
  white-space: nowrap;
}
.nv-links a:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.07);
}
.nv-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.3s var(--ease), color 0.3s var(--ease);
}
.nv-cta:hover {
  background: #fff;
  color: var(--ink);
}
.nv-cta .arrow {
  transition: transform 0.3s var(--ease);
}
.nv-cta:hover .arrow {
  transform: translateX(3px);
}
.nv a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.nv-rec {
  position: fixed;
  top: 30px;
  right: calc((100vw - min(100vw, 1240px + 2 * var(--gutter))) / 2 + var(--gutter) + 20px);
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  pointer-events: none;
  transition: opacity 0.4s var(--ease);
}
.nv-rec.hide { opacity: 0; }
@media (max-width: 1180px) {
  .nv-rec { display: none; }
}
@media (max-width: 820px) {
  .nv-links { display: none; }
  .nv-pill { width: 100%; max-width: 420px; justify-content: space-between; }
}
`;

export function Nav() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = scrollY;
    const onScroll = () => {
      const y = scrollY;
      if (y < 120) setHidden(false);
      else if (y > last + 4) setHidden(true);
      else if (y < last - 4) setHidden(false);
      last = y;
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{css}</style>
      <header className={`nv ${hidden ? 'hide' : ''}`} onFocusCapture={() => setHidden(false)}>
        <nav className="nv-pill" aria-label="Main">
          <a className="nv-logo" href="#top" aria-label="Whyline, back to top">
            <span className="nv-mark" aria-hidden>
              w
            </span>
            Whyline
          </a>
          <div className="nv-links">
            {LINKS_NAV.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </div>
          <a className="nv-cta" href="#start">
            Get Whyline <span className="arrow" aria-hidden>→</span>
          </a>
        </nav>
      </header>
      <div className={`nv-rec ${hidden ? 'hide' : ''}`} aria-hidden>
        <span className="dot" />
        Recording
      </div>
    </>
  );
}
