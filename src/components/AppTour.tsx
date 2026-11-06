import { useEffect, useRef, useState } from 'react';
import { TOUR_SLIDES } from '../domain/tourSlides';
import * as repo from '../data/repository';
import { useAppStore } from '../store/useAppStore';
import './AppTour.css';

export const OPEN_TOUR_EVENT = 'app-tour-open';

/** Swipeable intro shown once after setup; Settings → Take the tour opens it again. */
export function AppTour() {
  const settings = useAppStore((s) => s.settings);
  const refreshSettings = useAppStore((s) => s.refreshSettings);
  const [manual, setManual] = useState(false);
  const [i, setI] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const open = manual || (settings != null && !settings.tourDone);

  useEffect(() => {
    const onOpen = () => {
      setI(0);
      setManual(true);
    };
    window.addEventListener(OPEN_TOUR_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }, [i]);

  if (!open) return null;
  const last = i === TOUR_SLIDES.length - 1;

  const close = async () => {
    setManual(false);
    if (!settings?.tourDone) {
      await repo.updateSettings({ tourDone: true });
      await refreshSettings();
    }
  };

  // Sync dots after a swipe settles (ignores the in-between positions of a smooth scroll).
  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = track.current;
      if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
    }, 120);
  };

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={'Take the tour'}>
      <div className="tour-top">
        <button type="button" className="swap-link" onClick={() => void close()}>
          {'Skip'}
        </button>
      </div>
      <div className="tour-track" ref={track} onScroll={onScroll}>
        {TOUR_SLIDES.map((s) => (
          <section key={s.title} className="tour-slide">
            <div className="tour-icon" aria-hidden>
              {s.icon}
            </div>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}
      </div>
      <div className="tour-dots" aria-hidden>
        {TOUR_SLIDES.map((s, n) => (
          <span key={s.title} className={n === i ? 'on' : ''} />
        ))}
      </div>
      <button type="button" className="btn btn-primary tour-cta" onClick={() => (last ? void close() : setI(i + 1))}>
        {last ? "Let's go" : 'Next'}
      </button>
    </div>
  );
}
