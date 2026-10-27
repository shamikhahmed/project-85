import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressRing } from '../components/ProgressRing';
import { QuickLogSheet, type QuickLogMode } from '../components/QuickLogSheet';
import { WeeklyReviewCard } from '../components/WeeklyReviewCard';
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

const STATUS_FRIENDLY: Record<string, string> = {
  ON_TRACK: 'On track',
  NEEDS_ATTENTION: 'Needs a nudge',
  DAY_COMPLETED: 'Day locked in',
  INCOMPLETE_LOG: 'Still filling in',
};

function timeGreeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function focusPriorities(
  settings: NonNullable<ReturnType<typeof useAppStore.getState>['settings']>,
  agg: NonNullable<ReturnType<typeof useAppStore.getState>['todayAgg']>,
  primary: string,
): string[] {
  const items: string[] = [primary];
  if (agg.foodEntryCount === 0) items.push('Log lunch or a library meal via Quick Log');
  else if (!agg.honestyAnswered) items.push('Finish the honesty checklist tonight');
  if (agg.steps == null || agg.steps < settings.stepsTarget) {
    items.push(`Close the gap toward ${settings.stepsTarget.toLocaleString()} steps`);
  }
  if (agg.proteinG < settings.proteinTargetG * 0.85 && agg.foodEntryCount > 0) {
    items.push('Hit protein with tikka, boti, daal + egg, or whey');
  }
  if (settings.shoulderCaution && agg.workoutTypes.includes('strength')) {
    items.push('Protect the shoulder — skip painful presses');
  }
  return [...new Set(items)].slice(0, 3);
}

export function Dashboard() {
  const settings = useAppStore((s) => s.settings);
  const agg = useAppStore((s) => s.todayAgg);
  const score = useAppStore((s) => s.todayScore);
  const setNightlyOpen = useAppStore((s) => s.setNightlyOpen);
  const progress = useWeightProgress();
  const today = toLocalISODate();
  const [weightSeries, setWeightSeries] = useState<{ date: string; weightKg: number }[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickMode, setQuickMode] = useState<QuickLogMode>('meal');

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
    return (
      <div className="empty-state">
        <h2>Your next chapter starts with today’s data.</h2>
        <p>Log your first weight, meal or steps. You don’t need a perfect day to make progress.</p>
      </div>
    );
  }

  const daysLeft = calendarDaysRemaining(settings.deadline, today);
  const status = score?.status ?? 'INCOMPLETE_LOG';
  const weeklyHint =
    daysLeft > 0 ? (progress.remainingKg / (daysLeft / 7)).toFixed(2) : null;
  const showRecovery =
    score?.status === 'NEEDS_ATTENTION' || score?.status === 'INCOMPLETE_LOG';
  const focus = settings.focusMode;
  const priorities = focusPriorities(settings, agg, briefing.primaryAction);

  const openQuick = (mode: Exclude<QuickLogMode, null>) => {
    setQuickMode(mode);
    setQuickOpen(true);
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="greeting">
        <strong>{timeGreeting()}.</strong> {daysLeft} days to your birthday mission — one honest
        day at a time.
      </p>

      {!focus && (
        <header className="panel hero">
          <div className="hero-top">
            <div className="hero-copy">
              <p className="hero-eyebrow">Birthday transformation</p>
              <h1 className="hero-brand brand">
                <span className="hero-brand-mark">PROJECT</span>{' '}
                <span className="hero-brand-num">85</span>
              </h1>
              <p className="hero-meta muted">
                {settings.startDate} → {settings.deadline}
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
              <div className="label">To go</div>
              <div className="value">{progress.remainingKg} kg</div>
            </div>
          </div>

          <div className="hero-progress">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                Actual progress (not a projection)
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
              From {settings.startingWeightKg} → {settings.targetWeightKg} kg (
              {progress.requiredLossKg} kg).
              {weeklyHint != null && (
                <>
                  {' '}
                  Linear pace would be ~{weeklyHint} kg/week — a guide only
                  {Number(weeklyHint) > 0.9 ? ', and on the ambitious side.' : '.'}
                </>
              )}
            </p>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 10 }} aria-live="polite">
              <strong>Trend:</strong> {trend.message}
            </p>
          </div>
        </header>
      )}

      {focus ? (
        <section className="panel stack" aria-labelledby="focus-title">
          <div className="section-head">
            <div>
              <p className="briefing-kicker">Focus Mode</p>
              <h2 id="focus-title" className="briefing-title">
                Today’s three priorities
              </h2>
            </div>
            <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_FRIENDLY[status]}</span>
          </div>
          <ol className="focus-list">
            {priorities.map((p, i) => (
              <li key={p}>
                <span className="focus-num">{i + 1}</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
          <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
            {agg.primaryWeightKg == null
              ? 'No measurement yet. Add your morning weight when you’re ready.'
              : `Morning weight ${agg.primaryWeightKg} kg · ${trend.message}`}
          </p>
          <div className="quick-grid">
            <button type="button" className="btn btn-primary" onClick={() => openQuick('meal')}>
              Quick meal
            </button>
            <button type="button" className="btn" onClick={() => openQuick('water')}>
              Water
            </button>
            <button type="button" className="btn" onClick={() => openQuick('steps')}>
              Steps
            </button>
            <button type="button" className="btn" onClick={() => openQuick('weight')}>
              Weight
            </button>
          </div>
        </section>
      ) : (
        <section className="panel briefing" aria-labelledby="briefing-title">
          <p className="briefing-kicker">Do this next</p>
          <h2 id="briefing-title" className="briefing-title">
            {briefing.primaryAction}
          </h2>
          <ul className="briefing-list">
            {briefing.bullets.slice(0, 4).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <div className="section-head">
          <h2>Quick log</h2>
          <p className="muted">≈2–4 taps for a saved meal</p>
        </div>
        <div className="quick-grid">
          <button type="button" className="btn btn-primary" onClick={() => openQuick('meal')}>
            Meal
          </button>
          <button type="button" className="btn" onClick={() => openQuick('steps')}>
            Steps
          </button>
          <button type="button" className="btn" onClick={() => openQuick('water')}>
            Water
          </button>
          <button type="button" className="btn" onClick={() => openQuick('weight')}>
            Weight
          </button>
          <Link className="btn" to="/log?tab=workout">
            Workout
          </Link>
          <Link className="btn" to="/log?tab=smoking">
            Cigarettes
          </Link>
          <button type="button" className="btn" onClick={() => setNightlyOpen(true)}>
            Nightly check
          </button>
          <Link className="btn" to="/discipline">
            Review
          </Link>
        </div>
      </section>

      {!focus && (
        <section className="panel">
          <div className="section-head">
            <h2>Today’s scorecard</h2>
            <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_FRIENDLY[status]}</span>
          </div>
          <div className="grid-metrics">
            <ScoreMetric
              label="Steps"
              value={`${agg.steps ?? '—'} / ${settings.stepsTarget}`}
              done={agg.steps != null && agg.steps >= settings.stepsTarget}
            />
            <ScoreMetric
              label="Calories"
              value={
                agg.foodEntryCount === 0
                  ? 'Not logged'
                  : `${Math.round(agg.calories)} / ${settings.calorieTarget}`
              }
              done={agg.foodEntryCount > 0 && agg.honestyAnswered}
              provisional={agg.foodEntryCount > 0 && !agg.honestyAnswered}
            />
            <ScoreMetric
              label="Protein"
              value={
                agg.foodEntryCount === 0
                  ? '—'
                  : `${Math.round(agg.proteinG)} / ${settings.proteinTargetG} g`
              }
              done={agg.proteinG >= settings.proteinTargetG * 0.9}
            />
            <ScoreMetric
              label="Water"
              value={`${agg.waterMl || '—'} / ${settings.waterTargetMl} ml`}
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
              label="Score"
              value={`${score?.total ?? 0} / 100`}
              done={(score?.total ?? 0) >= 70}
            />
          </div>
          <p className="dim" style={{ fontSize: '0.8rem', marginTop: 12 }}>
            Blank logs stay blank — never counted as a perfect day. An honest estimate beats a
            perfect-looking guess.
          </p>
        </section>
      )}

      {showRecovery && (
        <section className="panel">
          <div className="section-head">
            <h2>Welcome back energy</h2>
            <p className="muted">Your previous effort still counts.</p>
          </div>
          <div className="stack">
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

      <WeeklyReviewCard />

      <QuickLogSheet
        open={quickOpen}
        initialMode={quickMode}
        onClose={() => setQuickOpen(false)}
      />
    </div>
  );
}

function ScoreMetric({
  label,
  value,
  done,
  provisional,
}: {
  label: string;
  value: string;
  done: boolean;
  provisional?: boolean;
}) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: '1rem' }}>
        {value}
      </div>
      <div
        className={`badge ${done ? 'badge-ok' : provisional ? 'badge-warn' : 'badge-info'}`}
        style={{ marginTop: 8 }}
      >
        {done ? 'Done' : provisional ? 'Provisional' : 'Open'}
      </div>
    </div>
  );
}
