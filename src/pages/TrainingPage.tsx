import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import plan from '../domain/trainingPlan.json';
import { useAppStore } from '../store/useAppStore';
import * as repo from '../data/repository';
import {
  PLAN_START,
  macrosFor,
  missionFor,
  planPhase,
  sessionFor,
  sundayCheckpoints,
} from '../domain/plan';
import { buildCheckin } from '../lib/checkin';
import { parseLocalDate, toLocalISODate } from '../lib/dates';
import './TrainingPage.css';

type DayKey = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'arms' | 'core' | 'rest';

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

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'legs', label: 'Legs' },
  { key: 'upper', label: 'Upper' },
  { key: 'lower', label: 'Lower' },
  { key: 'arms', label: 'Sat · Arms' },
  { key: 'core', label: 'Sat · Core' },
  { key: 'rest', label: 'Rest' },
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

function defaultDay(today: string): DayKey {
  const s = sessionFor(today < PLAN_START ? PLAN_START : today);
  if (s.key === 'saturday') return 'arms';
  if (s.key === 'rest') return 'rest';
  return s.key;
}

export function TrainingPage() {
  const settings = useAppStore((s) => s.settings);
  const setToast = useAppStore((s) => s.setToast);
  const today = toLocalISODate();
  const [day, setDay] = useState<DayKey>(() => defaultDay(today));
  const [checkin, setCheckin] = useState<string | null>(null);
  const phase = planPhase(today < PLAN_START ? PLAN_START : today);
  const session = sessionFor(today);
  const mission = missionFor(today < PLAN_START ? PLAN_START : today);
  const todayKey = defaultDay(today);
  const checkpoints = useMemo(() => (settings ? sundayCheckpoints(settings) : []), [settings]);

  if (!settings) return null;
  const macros = macrosFor(settings, today);
  const isLower = day === 'legs' || day === 'lower';
  const exercises = (plan.days as Record<string, PlanExercise[]>)[day] ?? [];
  const cardio = (plan.cardio as Record<string, { title: string; how: string[] }>)[day];

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
    const text = buildCheckin(settings, week, today, pk.length ? pk.reduce((a, b) => a + b, 0) / pk.length : null);
    setCheckin(text);
    try {
      await navigator.clipboard.writeText(text);
      setToast('Check-in copied — paste it into Claude');
    } catch {
      setToast('Select the text below and copy it');
    }
  };

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
            {session.note ? ` · ${session.note}` : ''} · {macros.calories} kcal · {macros.proteinG} g protein
          </p>
        </div>
        <div className="train-banner">
          <strong>Mode: {phase.mode}.</strong>{' '}
          {phase.mode === 'Basic' && 'Sets as written. Machines and cables: last set to true failure. Barbell lifts: 1 rep short.'}
          {phase.mode === 'Advanced' && 'Add the purple technique on the last set of each exercise.'}
          {phase.mode === 'Deload' && 'Same exercises, 60% weight, half the sets. Food stays the same.'}
          {phase.mode === 'Block B · Basic' && 'Swap to the blue Block B exercise on each card. Sets as written.'}
          {phase.mode === 'Block B · Advanced' && 'Block B exercises plus the purple technique on the last set.'}
          {phase.mode === 'Reveal' && 'Birthday week: lighter, no crash diet, no water cutting.'}
          {phase.mode === '—' && 'Weeks 1-2 are Basic: learn your weights.'}
          <br />
          <strong>Week {mission.week} mission:</strong> {mission.text}
        </div>
      </header>

      <nav className="train-days" aria-label="Training day">
        {DAYS.map((d) => (
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
          <a className="btn" href={pdfUrl(plan.pdf.rest)} target="_blank" rel="noopener">Open Sunday PDF</a>
        </section>
      )}

      {day === 'core' && (
        <section className="panel stack">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>{plan.satOption2.title}</h2>
          <p className="muted" style={{ margin: 0 }}>Pick this Saturday if you're sore, slept badly, or the scale is slow.</p>
          <ul className="train-list">
            {plan.satOption2.blocks.map(([t, d]) => (
              <li key={t} style={{ flexDirection: 'column', gap: 4 }}>
                <strong>{t}</strong>
                <span style={{ textAlign: 'left' }}>{d}</span>
              </li>
            ))}
          </ul>
          <a className="btn" href={pdfUrl(plan.pdf.core)} target="_blank" rel="noopener">Open Saturday option 2 PDF</a>
        </section>
      )}

      {exercises.length > 0 && (
        <>
          <section className="panel stack">
            <div className="section-head">
              <h2 style={{ fontSize: 'var(--text-lg)' }}>Warm-up · 8-10 min</h2>
              <a className="btn btn-ghost" href={pdfUrl((plan.pdf as Record<string, string>)[day])} target="_blank" rel="noopener">PDF</a>
            </div>
            <ul className="train-list">
              {[...plan.warmupBase, ...(isLower ? plan.warmupLower : plan.warmupUpper)].map(([n, dose, cue]) => (
                <li key={n}>
                  <span><strong>{n}</strong><br /><span className="dim">{cue}</span></span>
                  <span>{dose}</span>
                </li>
              ))}
            </ul>
            {!isLower && (
              <p className="dim" style={{ margin: 0, fontSize: 'var(--text-caption)' }}>
                No band "dislocates" over the head — that end position is how a shoulder comes out.
              </p>
            )}
          </section>

          <section className="stack" aria-label="Exercises">
            {exercises.map((ex, i) => (
              <details className="ex" key={ex.code + ex.name} open={i === 0}>
                <summary>
                  <span className="ex-code">{ex.code}</span>
                  <span>
                    <span className="ex-name">{phase.blockB && ex.blockB ? ex.blockB : ex.name}</span>
                    <span className="ex-muscle">{ex.muscle}{ex.pair ? ` · ${ex.pair}` : ''}</span>
                  </span>
                  <span className="ex-chev" aria-hidden>›</span>
                </summary>
                <div className="ex-body">
                  {phase.blockB && ex.blockB && (
                    <div className="ex-bb on"><strong>Block B</strong>Doing {ex.blockB} instead of {ex.name}. Same sets and reps.</div>
                  )}
                  <table className="ex-sets">
                    <thead><tr><th>Set</th><th>Reps</th><th>Weight</th></tr></thead>
                    <tbody>
                      {ex.sets.map(([s, r, w], j) => (
                        <tr key={j}><td>{s}</td><td>{r}</td><td>{w}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="ex-meta">
                    <strong>Rest:</strong> {ex.rest} {ex.warmupSet ? '· Warm-up set first (new exercise)' : ''}
                    {session.note && session.key !== 'rest' ? ` · ${session.note}` : ''}
                  </div>
                  <ul className="ex-cues">{ex.cues.map((c) => <li key={c}>{c}</li>)}</ul>
                  <div className="ex-why"><strong>Why this, why here</strong>{ex.why}</div>
                  {ex.advanced && (
                    <div className={`ex-adv${phase.advanced ? ' on' : ''}`}>
                      <strong>Advanced (weeks 3-4, 8-10){phase.advanced ? ' · use it now' : ''}</strong>{ex.advanced}
                    </div>
                  )}
                  {ex.blockB && !phase.blockB && (
                    <div className="ex-bb"><strong>Block B (from 7 Dec)</strong>{ex.blockB}</div>
                  )}
                  <div className="ex-meta"><strong>If busy:</strong> 1) {ex.alts[0]} · 2) {ex.alts[1]}</div>
                  {ex.note && <div className="dim" style={{ fontSize: 'var(--text-caption)' }}>{ex.note}</div>}
                  <a className="btn btn-primary" href={ex.demo} target="_blank" rel="noopener">Watch demo</a>
                </div>
              </details>
            ))}
          </section>

          {cardio && (
            <section className="panel stack">
              <h2 style={{ fontSize: 'var(--text-lg)' }}>Cardio · {cardio.title}</h2>
              <ul className="ex-cues">{cardio.how.map((h) => <li key={h}>{h}</li>)}</ul>
            </section>
          )}

          <section className="panel stack">
            <h2 style={{ fontSize: 'var(--text-lg)' }}>Cooldown · 5 min</h2>
            <ul className="train-list">
              {(isLower ? plan.cooldownLower : plan.cooldownUpper).map(([n, d]) => (
                <li key={n}><span>{n}</span><span>{d}</span></li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="panel stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Sunday checkpoints</h2>
        <p className="muted" style={{ margin: 0 }}>Target 7-day average for each Sunday on the line to {settings.targetWeightKg} kg.</p>
        <table className="cp-table">
          <thead><tr><th>Week</th><th>Sunday</th><th>Target avg</th></tr></thead>
          <tbody>
            {checkpoints.map((c) => {
              const now = today <= c.sunday && today > format(addDays(parseLocalDate(c.sunday), -7), 'yyyy-MM-dd');
              return (
                <tr key={c.sunday} className={now ? 'now' : ''}>
                  <td>{c.week}</td>
                  <td>{format(parseLocalDate(c.sunday), 'd MMM')}</td>
                  <td>{c.targetKg.toFixed(1)} kg</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="dim" style={{ margin: 0, fontSize: 'var(--text-caption)' }}>
          Behind 0.5-1 kg: +2,000 steps a day. Over 1 kg: +2,000 steps and drop breakfast carbs. Never under 240 g protein.
        </p>
      </section>

      <section className="panel stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Sunday check-in for Claude</h2>
        <p className="muted" style={{ margin: 0 }}>Copies your last 7 days of real logs. Paste it into Claude and fill in the notes.</p>
        <button type="button" className="btn btn-primary" onClick={() => void makeCheckin()}>Copy check-in</button>
        {checkin && <textarea className="checkin" readOnly value={checkin} aria-label="Check-in text" onFocus={(e) => e.currentTarget.select()} />}
      </section>

      <section className="panel stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Plan library</h2>
        <div className="pdf-links">
          {DOCS.map(([f, t, d]) => (
            <a key={f} href={pdfUrl(f)} target="_blank" rel="noopener">
              <span>{t}<small>{d}</small></span><span aria-hidden>›</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
