import { useEffect } from 'react';
import { startSmoothScroll } from './smooth';
import { Nav } from './sections/Nav';
import { Hero } from './sections/Hero';
import { Problem } from './sections/Problem';
import { Story } from './sections/Story';
import { How } from './sections/How';
import { Diagrams } from './sections/Diagrams';
import { Features } from './sections/Features';
import { Bob } from './sections/Bob';
import { Proof } from './sections/Proof';
import { CiGate } from './sections/CiGate';
import { Teams } from './sections/Teams';
import { Start } from './sections/Start';
import { Faq } from './sections/Faq';
import { Footer } from './sections/Footer';

export function App() {
  useEffect(() => {
    startSmoothScroll();
  }, []);
  return (
    <>
      <div
        id="progress"
        aria-hidden
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'var(--accent)', transformOrigin: '0 50%', transform: 'scaleX(0)', zIndex: 60 }}
      />
      <Nav />
      <main className="frame">
        <Hero />
        <Problem />
        <Story />
        <How />
        <Diagrams />
        <Features />
        <Bob />
        <Proof />
        <CiGate />
        <Teams />
        <Start />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
