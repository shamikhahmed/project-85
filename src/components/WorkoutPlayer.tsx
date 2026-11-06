import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPlayerSteps, stepAnnouncement, type PlayerExercise } from '../domain/workoutPlayer';
import { formatClock } from '../domain/restTimer';
import { beep, speak, stopSpeaking } from '../lib/voice';
import { ExerciseGif } from './ExerciseGif';
import './WorkoutPlayer.css';

interface Props {
  title: string;
  exercises: PlayerExercise[];
  /** Last logged weight per exercise name, to prefill. */
  lastKg: Record<string, number | undefined>;
  /** Names already logged today. */
  doneNames: string[];
  onLog: (name: string, kg: number | undefined, reps: number | undefined) => Promise<void>;
  onClose: () => void;
}

const VOICE_KEY = 'p85-player-voice';

function readVoice(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Full-screen guided workout: one set at a time, big animation, rest countdown with voice. */
export function WorkoutPlayer({ title, exercises, lastKg, doneNames, onLog, onClose }: Props) {
  const lang = 'en' as const;
  const steps = useMemo(() => buildPlayerSteps(exercises), [exercises]);
  const [idx, setIdx] = useState(() => {
    const i = steps.findIndex((s) => !doneNames.some((d) => d.toLowerCase() === s.name.toLowerCase()));
    return i < 0 ? 0 : i;
  });
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [voice, setVoice] = useState(readVoice);
  const [finished, setFinished] = useState(false);
  const [kg, setKg] = useState('');
  const [reps, setReps] = useState('');
  const [busy, setBusy] = useState(false);
  const lastBeep = useRef<number | null>(null);
  const step = steps[idx];
  const next = steps[idx + 1];
  const left = restEnd == null ? 0 : Math.max(0, Math.ceil((restEnd - now) / 1000));
  const resting = restEnd != null;

  // keep screen on
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    void nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);
    document.body.style.overflow = 'hidden';
    return () => {
      void lock?.release().catch(() => undefined);
      document.body.style.overflow = '';
      stopSpeaking();
    };
  }, []);

  // prefill weight when the step changes
  useEffect(() => {
    if (!step) return;
    const k = lastKg[step.name];
    setKg(k != null ? String(k) : '');
    setReps('');
  }, [step, lastKg]);

  // announce each new set
  useEffect(() => {
    if (step && voice && !resting && !finished) speak(stepAnnouncement(step), undefined, lang);
  }, [idx, voice, resting, finished, step, lang]);

  // rest countdown: tick, 3-2-1 beeps, auto-advance
  useEffect(() => {
    if (restEnd == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [restEnd]);

  useEffect(() => {
    if (restEnd == null) return;
    if (left <= 3 && left > 0 && lastBeep.current !== left) {
      lastBeep.current = left;
      beep();
    }
    if (left === 0) {
      lastBeep.current = null;
      beep(true);
      setRestEnd(null);
      setIdx((i) => Math.min(i + 1, steps.length - 1));
    }
  }, [left, restEnd, steps.length]);

  if (!step) return null;

  const toggleVoice = () => {
    const v = !voice;
    setVoice(v);
    if (!v) stopSpeaking();
    try {
      localStorage.setItem(VOICE_KEY, v ? 'on' : 'off');
    } catch {
      /* private mode */
    }
  };

  const completeSet = async () => {
    beep(); // unlocks audio on iPhone (inside a tap)
    if (step.logs) {
      const k = kg.trim() === '' ? undefined : Number(kg);
      const r = reps.trim() === '' ? undefined : Number(reps);
      const valid = (k == null || (Number.isFinite(k) && k >= 0 && k <= 500)) && (r == null || (Number.isInteger(r) && r >= 0 && r <= 100));
      if (valid && (k != null || r != null)) {
        setBusy(true);
        try {
          await onLog(step.name, k, r);
        } finally {
          setBusy(false);
        }
      }
    }
    if (!next) {
      setFinished(true);
      if (voice) speak('Workout complete. Well done!', 'ورزش مکمل۔ شاباش!', lang);
      return;
    }
    setNow(Date.now());
    setRestEnd(Date.now() + step.restSec * 1000);
    if (voice) speak(`Rest ${step.restSec} seconds. Next: ${next.name === step.name ? next.setLabel : next.name}.`, undefined, lang);
  };

  const go = (d: number) => {
    setRestEnd(null);
    setIdx((i) => Math.max(0, Math.min(steps.length - 1, i + d)));
  };

  const exCount = exercises.length;
  const progress = (idx + (resting ? 1 : 0)) / steps.length;

  return (
    <div className="player" role="dialog" aria-modal="true" aria-label={`${'Start workout'}: ${title}`}>
      <header className="player-top">
        <button type="button" className="player-icon" onClick={onClose} aria-label={'Exit'}>
          ✕
        </button>
        <div className="player-title">
          <strong>{title}</strong>
          <span>
            {step.exIndex + 1} / {exCount}
          </span>
        </div>
        <button type="button" className="player-icon" onClick={toggleVoice} aria-pressed={voice} aria-label={'Voice'}>
          {voice ? '🔊' : '🔇'}
        </button>
      </header>
      <div className="player-bar" aria-hidden>
        <span style={{ width: `${Math.round((finished ? 1 : progress) * 100)}%` }} />
      </div>

      {finished ? (
        <section className="player-main player-done">
          <div className="player-emoji" aria-hidden>
            🎉
          </div>
          <h2>{'Workout complete'}</h2>
          <p className="muted">{title}</p>
          <button type="button" className="btn btn-primary player-cta" onClick={onClose}>
            {'Done'}
          </button>
        </section>
      ) : resting ? (
        <section className="player-main player-rest">
          <span className="player-kicker">{'Rest'}</span>
          <div className="player-clock" aria-live="polite">
            {formatClock(left)}
          </div>
          <div className="player-next">
            <span className="player-kicker">{'Up next'}</span>
            <ExerciseGif name={next!.name} media={next!.media} size="sm" />
            <strong>{next!.name}</strong>
            <span className="muted">
              {next!.setLabel} · {next!.reps}
            </span>
          </div>
          <div className="player-row">
            <button type="button" className="btn" onClick={() => setRestEnd((e) => (e ?? Date.now()) + 15000)}>
              +15s
            </button>
            <button type="button" className="btn btn-primary" onClick={() => go(1)}>
              {'Skip rest'}
            </button>
          </div>
        </section>
      ) : (
        <section className="player-main">
          <ExerciseGif key={step.name} name={step.name} media={step.media} />
          <div className="player-head">
            <h2>{step.name}</h2>
            <span className="muted">{step.muscle}</span>
          </div>
          <div className="player-dots" aria-label={`${'Set'} ${step.setNo} ${'of'} ${step.setCount}`}>
            {Array.from({ length: step.setCount }, (_, i) => (
              <span key={i} className={i + 1 < step.setNo ? 'done' : i + 1 === step.setNo ? 'now' : ''} />
            ))}
          </div>
          <div className="player-set">
            <span className="player-kicker">{step.setLabel}</span>
            <div className="player-reps">{step.reps}</div>
            <span className="muted">{step.guide}</span>
          </div>
          {step.logs && (
            <div className="player-log">
              <label>
                kg
                <input inputMode="decimal" type="number" step="0.5" min="0" value={kg} onChange={(e) => setKg(e.target.value)} />
              </label>
              <label>
                reps
                <input inputMode="numeric" type="number" step="1" min="0" value={reps} placeholder={step.reps.split(/[-,\s]/)[0]} onChange={(e) => setReps(e.target.value)} />
              </label>
            </div>
          )}
          {step.cue && <p className="player-cue">{step.cue}</p>}
        </section>
      )}

      {!finished && !resting && (
        <footer className="player-foot">
          <button type="button" className="player-icon" onClick={() => go(-1)} disabled={idx === 0} aria-label={'Previous'}>
            ‹
          </button>
          <button type="button" className="btn btn-primary player-cta" disabled={busy} onClick={() => void completeSet()}>
            {step.logs ? 'Log set' : 'Done'} ✓
          </button>
          <button type="button" className="player-icon" onClick={() => go(1)} disabled={!next} aria-label={'Next'}>
            ›
          </button>
        </footer>
      )}
    </div>
  );
}
