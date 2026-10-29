import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import plan from '../domain/trainingPlan.json';
import { useAppStore } from '../store/useAppStore';
import * as repo from '../data/repository';
import {
  PLAN_END,
  PLAN_START,
  macrosFor,
  missionFor,
  planPhase,
  sessionFor,
  sundayCheckpoints,
  type PlanPhase,
} from '../domain/plan';
import {
  SWAP_REASONS,
  fallbackFor,
  orderedAlternatives,
  reasonLabel,
  resolveDisplayName,
  swapKey,
  type ActiveSwapMap,
  type SwapReason,
} from '../domain/exerciseSwap';
import type { WorkoutEntry, WorkoutExercise } from '../domain/types';
import { buildCheckin } from '../lib/checkin';
import { parseLocalDate, toLocalISODate } from '../lib/dates';
import { sleepDurationHours } from '../lib/dates';
import {
  PLAN_NOTE_PREFIX,
  lastLogsByName,
  loggedSetRow,
  progressionHint,
  type LastLog,
} from '../lib/trainingLog';
import './TrainingPage.css';

type DayKey = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'arms' | 'core' | 'rest' | 'pump';

interface PlanExercise {
  code: string;
  name: string;
  muscle: string;
  sets: string[][];
  rest: string;
  cues: string[];
  why: string;
  alts: string[];
  advanced: string | null;
  blockB: string | null;
  demo: string;
  warmupSet: boolean;
  note: string | null;
  pair: string | null;
}

const BASE_DAYS: { key: DayKey; label: string; session: string }[] = [
  { key: 'push', label: 'Push', session: 'Push' },
  { key: 'pull', label: 'Pull', session: 'Pull' },
  { key: 'legs', label: 'Legs', session: 'Legs' },
  { key: 'upper', label: 'Upper', session: 'Upper' },
  { key: 'lower', label: 'Lower', session: 'Lower' },
  { key: 'arms', label: 'Sat · Arms', session: 'Arms + Delts' },
  { key: 'core', label: 'Sat · Core', session: 'Cardio + Core' },
  { key: 'rest', label: 'Rest', session: 'Rest' },
];

const DOCS: [string, string, string][] = [
  ['0_Start_Here.pdf', 'Start Here', 'Why, letter, starting point'],
  ['1_Daily_System.pdf', 'Daily System', 'Weigh-in, Fitbit, non-negotiables'],
  ['2_Weekly_Missions.pdf', 'Weekly Missions', 'Targets and missions, weeks 1-10'],
  ['3_Food_Playbook.pdf', 'Food Playbook', 'Hand rules, groceries, meal prep'],
  ['4_Survival_Cards.pdf', 'Survival Cards', 'Weddings, restaurants, plateaus'],
  ['5_Birthday_Week.pdf', 'Birthday Week', '11-15 January'],
  ['8_Plan_Guide.pdf', 'Plan Guide', 'Split, techniques, every muscle'],
];

const pdfUrl = (file: string) => `${import.meta.env.BASE_URL}plan/${file}`;
const fmtDay = (iso: string) => format(parseLocalDate(iso), 'd MMM');

function defaultDay(today: string): DayKey {
  if (today === PLAN_END) return 'pump';
  const s = sessionFor(today < PLAN_START ? PLAN_START : today);
  if (s.key === 'saturday') return 'arms';
  if (s.key === 'rest') return 'rest';
  return s.key;
}

export function TrainingPage() {
  const settings = useAppStore((s) => s.settings);
  const setToast = useAppStore((s) => s.setToast);
  const refreshDay = useAppStore((s) => s.refreshDay);
  const today = toLocalISODate();
  const [day, setDay] = useState<DayKey>(() => defaultDay(today));
  const [checkin, setCheckin] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkoutEntry[]>([]);
  const [swaps, setSwaps] = useState<ActiveSwapMap>({});
  const [lastNightSleepH, setLastNightSleepH] = useState<number | null>(null);
  const ref = today < PLAN_START ? PLAN_START : today;
  const phase = planPhase(ref);
  const session = sessionFor(today);
  const mission = missionFor(ref);
  const todayKey = defaultDay(today);
  const checkpoints = useMemo(() => (settings ? sundayCheckpoints(settings) : []), [settings]);
  const days = useMemo(
    () =>
      today >= '2027-01-11' && today <= PLAN_END
        ? [...BASE_DAYS, { key: 'pump' as DayKey, label: 'Birthday pump', session: 'Birthday pump' }]
        : BASE_DAYS,
    [today],
  );
  /** Low sleep (<6h): suggest Basic even on Advanced weeks. */
  const effectivePhase = useMemo((): PlanPhase => {
    if (lastNightSleepH != null && lastNightSleepH < 6 && phase.advanced) {
      return { ...phase, advanced: false, mode: phase.blockB ? 'Block B · Basic' : 'Basic' };
    }
    return phase;
  }, [phase, lastNightSleepH]);

  const historyFrom = format(addDays(parseLocalDate(today), -120), 'yyyy-MM-dd');
  const loadHistory = useCallback(async () => {
    setHistory(await repo.getWorkoutsInRange(historyFrom, today));
  }, [historyFrom, today]);

  useEffect(() => {
    let cancelled = false;
    void repo.getWorkoutsInRange(historyFrom, today).then((rows) => {
      if (!cancelled) setHistory(rows);
    });
    void repo.getActiveSwaps(today).then((map) => {
      if (!cancelled) setSwaps(map);
    });
    const yday = format(addDays(parseLocalDate(today), -1), 'yyyy-MM-dd');
    void repo.getSleepByDate(yday).then((sl) => {
      if (cancelled || !sl) return;
      setLastNightSleepH(sleepDurationHours(sl.bedtime, sl.wakeTime));
    });
    return () => {
      cancelled = true;
    };
  }, [historyFrom, today]);

  const exercises = useMemo(
    () => (plan.days as Record<string, PlanExercise[]>)[day] ?? [],
    [day],
  );
  const displayName = useCallback(
    (ex: PlanExercise) =>
      resolveDisplayName(ex, { day, swaps, useBlockB: effectivePhase.blockB }),
    [day, swaps, effectivePhase.blockB],
  );
  const lastLogs = useMemo(
    () => lastLogsByName(history, exercises.map(displayName), today),
    [history, exercises, displayName, today],
  );
  const sessionLabel = days.find((d) => d.key === day)?.session ?? 'Session';
  const todaySession = history.find(
    (w) => w.date === today && w.notes === `${PLAN_NOTE_PREFIX}${sessionLabel}`,
  );

  if (!settings) return null;
  const macros = macrosFor(settings, today);
  const isLower = day === 'legs' || day === 'lower';
  const cardio = (plan.cardio as Record<string, { title: string; how: string[] }>)[day];

  const saveSet = async (name: string, weightKg: number | undefined, reps: number | undefined) => {
    const ex: WorkoutExercise = { name, weightKg, reps, sets: 1, notes: 'top set' };
    await repo.logPlanExercise(today, sessionLabel, ex);
    await Promise.all([loadHistory(), refreshDay()]);
    setToast(`${name} logged`);
  };

  const makeCheckin = async () => {
    const end = today;
    const start = format(addDays(parseLocalDate(end), -6), 'yyyy-MM-dd');
    const prevStart = format(addDays(parseLocalDate(end), -13), 'yyyy-MM-dd');
    const prevEnd = format(addDays(parseLocalDate(end), -7), 'yyyy-MM-dd');
    const [week, prev] = await Promise.all([
      repo.loadAggregatesInRange(start, end),
      repo.loadAggregatesInRange(prevStart, prevEnd),
    ]);
    const pk = prev.map((d) => d.primaryWeightKg).filter((v): v is number => v != null);
    const text = buildCheckin(
      settings,
      week,
      today,
      pk.length ? pk.reduce((a, b) => a + b, 0) / pk.length : null,
    );
    setCheckin(text);
    try {
      await navigator.clipboard.writeText(text);
      setToast('Check-in copied — paste it into Claude');
    } catch {
      setToast('Select the text below and copy it');
    }
  };

  const loggedCount = todaySession?.exercises?.length ?? 0;

  return (
    <div className="stack page">
      <header className="panel page-header stack">
        <div>
          <p className="briefing-kicker">
            {today < PLAN_START ? 'Plan starts Tue 3 Nov' : `Week ${phase.week} · ${phase.phase}`}
          </p>
          <h1>Train</h1>
          <p className="muted" style={{ margin: 0 }}>
            Today: <strong>{session.label}</strong>
            {session.note ? ` · ${session.note}` : ''} · {macros.calories} kcal · {macros.proteinG} g
            protein
          </p>
        </div>
        <div className="train-banner">
          <strong>Mode: {effectivePhase.mode}.</strong> <ModeText phase={effectivePhase} />
          <br />
          <strong>Week {mission.week} mission:</strong> {mission.text}
        </div>
        {lastNightSleepH != null && lastNightSleepH < 6 && (
          <div className="train-banner warn" role="status">
            Slept {Math.floor(lastNightSleepH)}h {Math.round((lastNightSleepH % 1) * 60)}m last
            night — using <strong>Basic</strong> today (skip Advanced techniques).
          </div>
        )}
      </header>

      <nav className="train-days" aria-label="Training day">
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            className={`${day === d.key ? 'active' : ''} ${todayKey === d.key ? 'today' : ''}`}
            aria-pressed={day === d.key}
            onClick={() => setDay(d.key)}
          >
            {d.label}
          </button>
        ))}
      </nav>

      {day === 'rest' && (
        <section className="panel stack">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Rest + Sunday check-in</h2>
          <ul className="train-list">
            <li><span>Easy walk</span><span>30-40 min</span></li>
            <li><span>Weigh-in average + waist</span><span>Sunday</span></li>
            <li><span>Photos</span><span>Every 2nd Sunday</span></li>
            <li><span>Meal prep</span><span>Protein for 3 days</span></li>
          </ul>
          <a className="btn" href={pdfUrl(plan.pdf.rest)} target="_blank" rel="noopener">
            Open Sunday PDF
          </a>
        </section>
      )}

      {day === 'core' && (
        <section className="panel stack">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>{plan.satOption2.title}</h2>
          <p className="muted" style={{ margin: 0 }}>
            Pick this Saturday if you're sore, slept badly, or the scale is slow.
          </p>
          <ul className="train-list">
            {plan.satOption2.blocks.map(([t, d]) => (
              <li key={t} style={{ flexDirection: 'column', gap: 4 }}>
                <strong>{t}</strong>
                <span style={{ textAlign: 'left' }}>{d}</span>
              </li>
            ))}
          </ul>
          <a className="btn" href={pdfUrl(plan.pdf.core)} target="_blank" rel="noopener">
            Open Saturday option 2 PDF
          </a>
        </section>
      )}

      {day === 'pump' && (
        <section className="panel stack">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>{plan.birthdayPump.title}</h2>
          <p className="muted" style={{ margin: 0 }}>{plan.birthdayPump.when}</p>
          <ul className="train-list">
            {plan.birthdayPump.moves.map(([n, d]) => (
              <li key={n}><span>{n}</span><span>{d}</span></li>
            ))}
          </ul>
          <p className="muted" style={{ margin: 0 }}>{plan.birthdayPump.after}</p>
          <a className="btn" href={pdfUrl(plan.pdf.pump)} target="_blank" rel="noopener">
            Open Birthday Week PDF
          </a>
        </section>
      )}

      {exercises.length > 0 && (
        <>
          <section className="panel stack">
            <div className="section-head">
              <h2 style={{ fontSize: 'var(--text-lg)' }}>Warm-up · 8-10 min</h2>
              <a
                className="btn btn-ghost"
                href={pdfUrl((plan.pdf as Record<string, string>)[day])}
                target="_blank"
                rel="noopener"
              >
                PDF
              </a>
            </div>
            <ul className="train-list">
              {[...plan.warmupBase, ...(isLower ? plan.warmupLower : plan.warmupUpper)].map(
                ([n, dose, cue]) => (
                  <li key={n}>
                    <span>
                      <strong>{n}</strong>
                      <br />
                      <span className="dim">{cue}</span>
                    </span>
                    <span>{dose}</span>
                  </li>
                ),
              )}
            </ul>
            {!isLower && (
              <p className="dim" style={{ margin: 0, fontSize: 'var(--text-caption)' }}>
                No band "dislocates" over the head — that end position is how a shoulder comes out.
              </p>
            )}
          </section>

          <p className="muted" style={{ margin: '0 4px' }}>
            {loggedCount > 0
              ? `${loggedCount} of ${exercises.length} exercises logged today.`
              : 'Log your top set on each card. Next time the app shows it and tells you whether to add weight.'}
          </p>

          <section className="stack" aria-label="Exercises">
            {exercises.map((ex, i) => {
              const name = displayName(ex);
              const key = swapKey(day, ex.code);
              const swap = swaps[key];
              const todayEx = todaySession?.exercises?.find(
                (e) => e.name.toLowerCase() === name.toLowerCase(),
              );
              return (
                <ExerciseCard
                  key={ex.code + ex.name}
                  ex={ex}
                  name={name}
                  planName={ex.name}
                  phase={effectivePhase}
                  sessionNote={session.key !== 'rest' ? session.note : null}
                  last={lastLogs[name]}
                  todayLog={todayEx}
                  defaultOpen={i === 0}
                  swap={swap}
                  shoulderCaution={settings.shoulderCaution}
                  onSave={saveSet}
                  onSwap={async (swappedName, reason) => {
                    const map = await repo.setExerciseSwap({
                      date: today,
                      dayKey: day,
                      code: ex.code,
                      planName: ex.name,
                      swappedName,
                      reason,
                    });
                    setSwaps(map);
                  }}
                  onUndoSwap={async () => {
                    const map = await repo.clearExerciseSwap(today, day, ex.code);
                    setSwaps(map);
                  }}
                />
              );
            })}
          </section>

          {cardio && (
            <section className="panel stack">
              <h2 style={{ fontSize: 'var(--text-lg)' }}>Cardio · {cardio.title}</h2>
              <ul className="ex-cues">
                {cardio.how.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel stack">
            <h2 style={{ fontSize: 'var(--text-lg)' }}>Cooldown · 5 min</h2>
            <ul className="train-list">
              {(isLower ? plan.cooldownLower : plan.cooldownUpper).map(([n, d]) => (
                <li key={n}>
                  <span>{n}</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="panel stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Sunday checkpoints</h2>
        <p className="muted" style={{ margin: 0 }}>
          Target 7-day average for each Sunday on the line to {settings.targetWeightKg} kg.
        </p>
        <table className="cp-table">
          <thead>
            <tr>
              <th>Week</th>
              <th>Sunday</th>
              <th>Target avg</th>
            </tr>
          </thead>
          <tbody>
            {checkpoints.map((c) => {
              const now =
                today <= c.sunday &&
                today > format(addDays(parseLocalDate(c.sunday), -7), 'yyyy-MM-dd');
              return (
                <tr key={c.sunday} className={now ? 'now' : ''}>
                  <td>{c.week}</td>
                  <td>{fmtDay(c.sunday)}</td>
                  <td>{c.targetKg.toFixed(1)} kg</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="dim" style={{ margin: 0, fontSize: 'var(--text-caption)' }}>
          Behind 0.5-1 kg: +2,000 steps a day. Over 1 kg: +2,000 steps and drop breakfast carbs.
          Never under 240 g protein.
        </p>
      </section>

      <section className="panel stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Sunday check-in for Claude</h2>
        <p className="muted" style={{ margin: 0 }}>
          Copies your last 7 days of real logs. Paste it into Claude and fill in the notes.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => void makeCheckin()}>
          Copy check-in
        </button>
        {checkin && (
          <textarea
            className="checkin"
            readOnly
            value={checkin}
            aria-label="Check-in text"
            onFocus={(e) => e.currentTarget.select()}
          />
        )}
      </section>

      <section className="panel stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Plan library</h2>
        <div className="pdf-links">
          {DOCS.map(([f, t, d]) => (
            <a key={f} href={pdfUrl(f)} target="_blank" rel="noopener">
              <span>
                {t}
                <small>{d}</small>
              </span>
              <span aria-hidden>›</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModeText({ phase }: { phase: PlanPhase }) {
  switch (phase.mode) {
    case 'Basic':
      return <>Sets as written. Machines and cables: last set to true failure. Barbell lifts: 1 rep short.</>;
    case 'Advanced':
      return <>Add the purple technique on the last set of each exercise.</>;
    case 'Deload':
      return <>Same exercises at about 60% of your logged weights, half the sets. Food stays the same.</>;
    case 'Block B · Basic':
      return <>Block B exercises (blue). Recalibrate: start lighter, the weights on the cards were for Block A.</>;
    case 'Block B · Advanced':
      return <>Block B exercises plus the purple technique on the last set.</>;
    case 'Reveal':
      return <>Birthday week: lighter, no crash diet, no water cutting.</>;
    default:
      return <>Weeks 1-2 are Basic: learn your weights and log them.</>;
  }
}

function ExerciseCard({
  ex,
  name,
  planName,
  phase,
  sessionNote,
  last,
  todayLog,
  defaultOpen,
  swap,
  shoulderCaution,
  onSave,
  onSwap,
  onUndoSwap,
}: {
  ex: PlanExercise;
  name: string;
  planName: string;
  phase: PlanPhase;
  sessionNote: string | null;
  last: LastLog | undefined;
  todayLog: WorkoutExercise | undefined;
  defaultOpen: boolean;
  swap?: { name: string; reason: SwapReason };
  shoulderCaution: boolean;
  onSave: (name: string, weightKg: number | undefined, reps: number | undefined) => Promise<void>;
  onSwap: (swappedName: string, reason: SwapReason) => Promise<void>;
  onUndoSwap: () => Promise<void>;
}) {
  const row = loggedSetRow(ex.sets);
  const repRange = row?.[1] ?? '';
  const fallback = fallbackFor(ex.muscle, shoulderCaution);
  const [reason, setReason] = useState<SwapReason>(swap?.reason ?? 'busy');
  const alts = orderedAlternatives(ex.alts, fallback, reason);
  // Inputs show today's log, else last time's weight — cleared on fresh swap.
  const derivedKg = todayLog?.weightKg ?? (swap ? undefined : last?.weightKg);
  const [kgEdit, setKgEdit] = useState<string | null>(null);
  const [repsEdit, setRepsEdit] = useState<string | null>(null);
  const [freshSwap, setFreshSwap] = useState(false);
  const kg = kgEdit ?? (derivedKg != null ? String(derivedKg) : '');
  const reps = repsEdit ?? (todayLog?.reps != null ? String(todayLog.reps) : '');
  const [busy, setBusy] = useState(false);
  const usingBlockB = !swap && phase.blockB && ex.blockB != null;
  const kgId = `kg-${ex.code}-${ex.name}`.replace(/[^a-zA-Z0-9-]/g, '');
  const repsId = `reps-${ex.code}-${ex.name}`.replace(/[^a-zA-Z0-9-]/g, '');

  const save = async () => {
    const k = kg.trim() === '' ? undefined : Number(kg);
    const r = reps.trim() === '' ? undefined : Number(reps);
    if ((k != null && (!Number.isFinite(k) || k < 0 || k > 500)) || (r != null && (!Number.isInteger(r) || r < 0 || r > 100))) {
      return;
    }
    if (k == null && r == null) return;
    setBusy(true);
    try {
      await onSave(name, k, r);
      setKgEdit(null);
      setRepsEdit(null);
      setFreshSwap(false);
    } finally {
      setBusy(false);
    }
  };

  const pickAlt = async (alt: string) => {
    setBusy(true);
    try {
      await onSwap(alt, reason);
      setKgEdit('');
      setRepsEdit('');
      setFreshSwap(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className={`ex${todayLog ? ' done' : ''}`} open={defaultOpen}>
      <summary>
        <span className="ex-code">{todayLog ? '✓' : ex.code}</span>
        <span>
          <span className="ex-name">{name}</span>
          <span className="ex-muscle">
            {ex.muscle}
            {ex.pair ? ` · ${ex.pair}` : ''}
          </span>
          {swap && (
            <span className="ex-swap-badge">
              Swapped: {planName} → {swap.name} ({reasonLabel(swap.reason).toLowerCase()})
            </span>
          )}
        </span>
        <span className="ex-chev" aria-hidden>
          ›
        </span>
      </summary>
      <div className="ex-body">
        {usingBlockB && (
          <div className="ex-bb on">
            <strong>Block B</strong>Doing {ex.blockB} instead of {ex.name}. Same sets and reps; start
            lighter and recalibrate the weight.
          </div>
        )}
        <table className="ex-sets">
          <thead>
            <tr>
              <th>Set</th>
              <th>Reps</th>
              <th>{usingBlockB ? 'Block A weight (guide)' : 'Weight'}</th>
            </tr>
          </thead>
          <tbody>
            {ex.sets.map(([s, r, w], j) => (
              <tr key={j}>
                <td>{s}</td>
                <td>{r}</td>
                <td>{w}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ex-swap">
          <strong>Machine busy or broken?</strong>
          <div className="ex-reason" role="group" aria-label="Swap reason">
            {SWAP_REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={reason === r.id ? 'active' : ''}
                aria-pressed={reason === r.id}
                onClick={() => setReason(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {reason === 'pain' && (
            <p className="ex-pain" role="alert">
              Stop — don&apos;t push through pain. Prefer the lowest-load option first.
            </p>
          )}
          <div className="ex-alt-chips">
            {alts.map((alt) => (
              <button
                key={alt}
                type="button"
                className={swap?.name === alt ? 'active' : ''}
                disabled={busy}
                onClick={() => void pickAlt(alt)}
              >
                {alt}
              </button>
            ))}
          </div>
          {swap && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void onUndoSwap()}>
              Undo swap / back to plan
            </button>
          )}
        </div>

        <div className="ex-log">
          <div className="ex-log-head">
            <strong>Log your {row?.[0]?.toLowerCase().startsWith('top') ? 'top set' : 'hardest set'}</strong>
            <span>
              {last?.weightKg != null
                ? `Last: ${last.weightKg} kg${last.reps != null ? ` × ${last.reps}` : ''} (${fmtDay(last.date)})`
                : 'No log yet'}
            </span>
          </div>
          <p className="ex-hint">
            {freshSwap || (swap && !todayLog)
              ? 'New exercise: pick a weight you can do for the top of the rep range with 1–2 reps left'
              : progressionHint(last, repRange)}
          </p>
          <div className="ex-log-row">
            <label htmlFor={kgId}>
              kg
              <input
                id={kgId}
                inputMode="decimal"
                type="number"
                step="0.5"
                min="0"
                value={kg}
                onChange={(e) => setKgEdit(e.target.value)}
              />
            </label>
            <label htmlFor={repsId}>
              reps
              <input
                id={repsId}
                inputMode="numeric"
                type="number"
                step="1"
                min="0"
                placeholder={repRange.split(',')[0]}
                value={reps}
                onChange={(e) => setRepsEdit(e.target.value)}
              />
            </label>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
              {todayLog ? 'Update' : 'Save'}
            </button>
          </div>
        </div>

        <div className="ex-meta">
          <strong>Rest:</strong> {ex.rest} {ex.warmupSet ? '· Warm-up set first (new exercise)' : ''}
          {sessionNote ? ` · ${sessionNote}` : ''}
        </div>
        <ul className="ex-cues">
          {ex.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="ex-why">
          <strong>Why this, why here</strong>
          {ex.why}
        </div>
        {ex.advanced && (
          <div className={`ex-adv${phase.advanced ? ' on' : ''}`}>
            <strong>Advanced (weeks 3-4, 8-10){phase.advanced ? ' · use it now' : ''}</strong>
            {ex.advanced}
          </div>
        )}
        {ex.blockB && !phase.blockB && !swap && (
          <div className="ex-bb">
            <strong>Block B (from 7 Dec)</strong>
            {ex.blockB}
          </div>
        )}
        {ex.note && (
          <div className="dim" style={{ fontSize: 'var(--text-caption)' }}>
            {ex.note}
          </div>
        )}
        <a className="btn" href={ex.demo} target="_blank" rel="noopener">
          Watch demo
        </a>
      </div>
    </details>
  );
}
