import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressRing } from '../components/ProgressRing';
import * as repo from '../data/repository';
import { buildDailyBriefing } from '../lib/briefing';
import { calendarDaysRemaining, toLocalISODate } from '../lib/dates';
import { buildRecoveryPlan } from '../lib/recovery';
import { assessWeightTrend } from '../lib/weightTrend';
import { useAppStore, useWeightProgress } from '../store/useAppStore';

const STATUS_CLASS: Record<string, string> = {
  ON_TRACK: 'badge-ok',
  NEEDS_ATTENTION: 'badge-warn',
  DAY_COMPLETED: 'badge-accent',
  INCOMPLETE_LOG: 'badge-info',
};

export function Dashboard() {
  const settings = useAppStore((s) => s.settings);
  const agg = useAppStore((s) => s.todayAgg);
  const score = useAppStore((s) => s.todayScore);
  const actions = useAppStore((s) => s.nextActions);
  const setNightlyOpen = useAppStore((s) => s.setNightlyOpen);
  const progress = useWeightProgress();
  const today = toLocalISODate();
  const [weightSeries, setWeightSeries] = useState<{ date: string; weightKg: number }[]>([]);

  useEffect(() => {
    void (async () => {
      const all = await repo.getAllWeights();
      setWeightSeries(
        all.filter((w) => w.isPrimaryMorning).map((w) => ({ date: w.date, weightKg: w.weightKg })),
      );
    })();
  }, [agg?.primaryWeightKg]);

  const trend = useMemo(() => assessWeightTrend(weightSeries), [weightSeries]);
  const briefing = useMemo(() => {
    if (!settings || !agg) return null;
    return buildDailyBriefing({ settings, agg, score, weightTrend: trend });
  }, [settings, agg, score, trend]);
  const recovery = useMemo(() => {
    if (!settings || !score) return [];
    return buildRecoveryPlan(score.breakdown, settings);
  }, [settings, score]);

  if (!settings || !agg || !progress || !briefing) {
    return <div className="empty-state">Loading mission data…</div>;
  }

  const daysLeft = calendarDaysRemaining(settings.deadline, today);
  const status = score?.status ?? 'INCOMPLETE_LOG';
  const weeklyHint =
    daysLeft > 0
      ? (progress.remainingKg / (daysLeft / 7)).toFixed(2)
      : null;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="panel briefing" aria-labelledby="briefing-title">
        <p className="hero-eyebrow" style={{ margin: 0 }}>
          Mission briefing
        </p>
        <h2 id="briefing-title" style={{ fontSize: '1.15rem', marginTop: 4 }}>
          {briefing.primaryAction}
        </h2>
        <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
          {briefing.bullets.map((b) => (
            <li key={b} className="muted" style={{ marginBottom: 6, fontSize: '0.92rem' }}>
              {b}
            </li>
          ))}
        </ul>
      </section>

      <header className="panel hero">
        <div className="hero-top">
          <div className="hero-copy">
            <p className="hero-eyebrow">Birthday transformation</p>
            <h1 className="hero-brand brand">
              <span className="hero-brand-mark">PROJECT</span>{' '}
              <span className="hero-brand-num">85</span>
            </h1>
            <p className="hero-meta muted">
              {settings.startDate} → {settings.deadline} · {daysLeft} days left
            </p>
          </div>
          <ProgressRing
            value={progress.percentComplete}
            label={`${progress.percentComplete}%`}
            sublabel="to 85 kg"
            size={112}
          />
        </div>

        <div className="grid-metrics hero-metrics">
          <div className="metric">
            <div className="label">Current</div>
            <div className="value">
              {agg.primaryWeightKg ?? '—'}
              <span className="dim" style={{ fontSize: '0.85rem' }}>
                {' '}
                kg
              </span>
            </div>
          </div>
          <div className="metric">
            <div className="label">Target</div>
            <div className="value">{settings.targetWeightKg} kg</div>
          </div>
          <div className="metric">
            <div className="label">Lost</div>
            <div className="value">{progress.lostKg} kg</div>
          </div>
          <div className="metric">
            <div className="label">Remaining</div>
            <div className="value">{progress.remainingKg} kg</div>
          </div>
        </div>

        <div className="hero-progress">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Actual weight-loss progress
            </span>
            <span className="mono muted">{progress.percentComplete}%</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={progress.percentComplete}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Actual weight-loss progress"
          >
            <div className="progress-fill" style={{ width: `${progress.percentComplete}%` }} />
          </div>
          <p className="dim" style={{ fontSize: '0.75rem', marginTop: 8 }}>
            Required loss from {settings.startingWeightKg} kg → {settings.targetWeightKg} kg ={' '}
            {progress.requiredLossKg} kg. Projection lives on Progress — never confused with actual.
            {weeklyHint != null && (
              <>
                {' '}
                Arithmetic pace if linear: ~{weeklyHint} kg/week — informational only, not a
                prescription
                {Number(weeklyHint) > 0.9
                  ? ' (faster than common 0.45–0.9 kg/week public-health guidance — stay sustainable).'
                  : '.'}
              </>
            )}
          </p>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: 10 }} aria-live="polite">
            <strong>Trend:</strong> {trend.message}
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.1rem' }}>Today’s scorecard</h2>
          <span className={`badge ${STATUS_CLASS[status]}`}>{status.replace(/_/g, ' ')}</span>
        </div>
        <div className="grid-metrics" style={{ marginTop: 12 }}>
          <ScoreMetric
            label="Steps"
            value={`${agg.steps ?? '—'} / ${settings.stepsTarget}`}
            done={agg.steps != null && agg.steps >= settings.stepsTarget}
          />
          <ScoreMetric
            label="Calories"
            value={`${Math.round(agg.calories)} / ${settings.calorieTarget}`}
            done={agg.foodEntryCount > 0 && agg.honestyAnswered}
          />
          <ScoreMetric
            label="Protein"
            value={`${Math.round(agg.proteinG)} / ${settings.proteinTargetG} g`}
            done={agg.proteinG >= settings.proteinTargetG * 0.9}
          />
          <ScoreMetric
            label="Water"
            value={`${agg.waterMl} / ${settings.waterTargetMl} ml`}
            done={agg.waterMl >= settings.waterTargetMl}
          />
          <ScoreMetric
            label="Workout"
            value={agg.workoutTypes.length ? agg.workoutTypes.join(', ') : 'Not logged'}
            done={agg.workoutTypes.length > 0}
          />
          <ScoreMetric
            label="Sleep"
            value={agg.sleepHours != null ? `${agg.sleepHours} h` : 'Not logged'}
            done={agg.sleepHours != null && agg.sleepHours >= settings.sleepTargetHours * 0.85}
          />
          <ScoreMetric
            label="Cigarettes"
            value={agg.cigarettesLogged ? String(agg.cigaretteCount) : 'Not logged'}
            done={agg.cigarettesLogged && agg.cigaretteCount <= settings.cigaretteTarget}
          />
          <ScoreMetric
            label="Adherence"
            value={`${score?.total ?? 0} / 100`}
            done={(score?.total ?? 0) >= 70}
          />
        </div>
        <p className="dim" style={{ fontSize: '0.8rem', marginTop: 12 }}>
          Incomplete log ≠ success. Low calories alone never mark a day complete.
        </p>
      </section>

      <section className="panel">
        <h2 style={{ fontSize: '1.1rem' }}>What should I do next?</h2>
        <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>
          {actions.map((a) => (
            <li key={a} style={{ marginBottom: 8 }}>
              {a}
            </li>
          ))}
        </ul>
      </section>

      {(score?.status === 'NEEDS_ATTENTION' || score?.status === 'INCOMPLETE_LOG') && (
        <section className="panel">
          <h2 style={{ fontSize: '1.1rem' }}>Recovery — not reset</h2>
          <p className="dim" style={{ fontSize: '0.85rem', marginTop: 0 }}>
            Missed targets get a practical adjustment. Previous progress stays.
          </p>
          <div className="stack" style={{ marginTop: 8 }}>
            {recovery.map((r) => (
              <div key={r.id} className="metric">
                <strong>{r.title}</strong>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                  {r.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Quick actions</h2>
        <div className="quick-grid">
          <Link className="btn" to="/log?tab=food">
            Log food
          </Link>
          <Link className="btn" to="/log?tab=steps">
            Add steps
          </Link>
          <Link className="btn" to="/log?tab=water">
            Add water
          </Link>
          <Link className="btn" to="/log?tab=weight">
            Record weight
          </Link>
          <Link className="btn" to="/log?tab=workout">
            Log workout
          </Link>
          <Link className="btn" to="/log?tab=smoking">
            Log cigarettes
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => setNightlyOpen(true)}>
            Nightly Truth Check
          </button>
          <Link className="btn btn-primary" to="/discipline">
            Finish daily review
          </Link>
        </div>
      </section>
    </div>
  );
}

function ScoreMetric({
  label,
  value,
  done,
}: {
  label: string;
  value: string;
  done: boolean;
}) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: '1rem' }}>
        {value}
      </div>
      <div className={`badge ${done ? 'badge-ok' : 'badge-info'}`} style={{ marginTop: 8 }}>
        {done ? 'OK' : 'Open'}
      </div>
    </div>
  );
}
