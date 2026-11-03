import { useEffect, useRef, useState } from 'react';
import { formatClock, secondsLeft } from '../domain/restTimer';

export type RestState = { endsAt: number; total: number; label: string } | null;

/** Short double beep + vibration when rest ends (vibration is ignored where unsupported). */
function signalDone() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // ignore
  }
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.25].forEach((at) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.2);
    });
    setTimeout(() => void ctx.close(), 800);
  } catch {
    // ignore
  }
}

export function RestTimer({
  rest,
  onChange,
}: {
  rest: RestState;
  onChange: (next: RestState) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const signalled = useRef<number | null>(null);

  useEffect(() => {
    if (!rest) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [rest]);

  const left = rest ? secondsLeft(rest.endsAt, now) : 0;

  useEffect(() => {
    if (rest && left === 0 && signalled.current !== rest.endsAt) {
      signalled.current = rest.endsAt;
      signalDone();
    }
  }, [rest, left]);

  if (!rest) return null;
  const done = left === 0;
  const pct = rest.total > 0 ? Math.min(100, ((rest.total - left) / rest.total) * 100) : 100;

  return (
    <div className={`rest-timer${done ? ' done' : ''}`} role="timer" aria-live="polite">
      <div className="rest-timer-bar" style={{ width: `${pct}%` }} aria-hidden />
      <div className="rest-timer-body">
        <div className="rest-timer-text">
          <span className="rest-timer-label">{done ? 'Rest done · next set' : `Rest · ${rest.label}`}</span>
          <span className="rest-timer-clock mono">{formatClock(left)}</span>
        </div>
        {!done && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onChange({ ...rest, endsAt: rest.endsAt + 30_000, total: rest.total + 30 })}
          >
            +30s
          </button>
        )}
        <button type="button" className="btn" onClick={() => onChange(null)}>
          {done ? 'Close' : 'Skip'}
        </button>
      </div>
    </div>
  );
}
