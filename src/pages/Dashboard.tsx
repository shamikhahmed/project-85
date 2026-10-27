import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MetricChip } from '../components/MetricChip';
import { ProgressRing } from '../components/ProgressRing';
import { QuickLogSheet, type QuickLogMode } from '../components/QuickLogSheet';
import { WeeklyReviewCard } from '../components/WeeklyReviewCard';
import * as repo from '../data/repository';
import { buildDailyBriefing, type QuickActionKind } from '../lib/briefing';
import { assessComeback, type ComebackState } from '../lib/comeback';
import { calendarDaysElapsed, calendarDaysRemaining, toLocalISODate } from '../lib/dates';
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

function mapQuick(kind: QuickActionKind): Exclude<QuickLogMode, null> | 'nightly' | 'workout' {
  if (kind === 'shake') return 'meal';
  if (kind === 'nightly') return 'nightly';
  if (kind === 'workout') return 'workout';
  return kind;
}

function focusPriorities(
  settings: NonNullable<ReturnType<typeof useAppStore.getState>['settings']>,
  agg: NonNullable<ReturnType<typeof useAppStore.getState>['todayAgg']>,
  primary: string,
): string[] {
  const items: string[] = [primary];
  if (agg.foodEntryCount === 0) items.push('Log a meal via Quick Log');
  else if (!agg.honestyAnswered) items.push('Finish the honesty checklist tonight');
  if (agg.steps == null || agg.steps < settings.stepsTarget) {
    items.push(
      `Move toward ${settings.stepsTarget.toLocaleString()} steps when it fits — don’t sacrifice sleep`,
    );
  }
  if (agg.proteinG < settings.proteinTargetG * 0.85 && agg.foodEntryCount > 0) {
    items.push('Hit protein with tikka, boti, daal, or whey');
  }
  if (settings.shoulderCaution && agg.workoutTypes.includes('strength')) {
    items.push('Protect the shoulder — skip painful presses');
  }
  return [...new Set(items)].slice(0, 3);
}

export function Dashboard() {
  const settings = useAppStore((s) => s.settings);
  const ready = useAppStore((s) => s.ready);
  const agg = useAppStore((s) => s.todayAgg);
  const score = useAppStore((s) => s.todayScore);
  const setNightlyOpen = useAppStore((s) => s.setNightlyOpen);
  const progress = useWeightProgress();
  const navigate = useNavigate();
  const today = toLocalISODate();
  const [weightSeries, setWeightSeries] = useState<{ date: string; weightKg: number }[]>([]);
  const [comeback, setComeback] = useState<ComebackState | null>(null);
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

  useEffect(() => {
    if (!settings) return;
    void (async () => {
      const start = settings.startDate;
      const days = await repo.loadAggregatesInRange(start, today);
      setComeback(assessComeback(days, today));
    })();
  }, [settings, today, agg?.loggingCompleteness, agg?.foodEntryCount, agg?.steps]);

  const trend = useMemo(() => assessWeightTrend(weightSeries), [weightSeries]);
  const briefing = useMemo(() => {
    if (!settings || !agg) return null;
    return buildDailyBriefing({ settings, agg, score, weightTrend: trend });
  }, [settings, agg, score, trend]);
  const recovery = useMemo(() => {
    if (!settings || !score) return [];
    return buildRecoveryPlan(score.breakdown, settings);
  }, [settings, score]);

  if (!ready || !settings || !agg || !progress || !briefing) {
    return (
      <div className="empty-state">
        <h2>Opening PROJECT 85…</h2>
        <p className="muted">Loading your private mission data on this device.</p>
      </div>
    );
  }

  const daysLeft = calendarDaysRemaining(settings.deadline, today);
  const daysIn = calendarDaysElapsed(settings.startDate, today);
  const status = score?.status ?? 'INCOMPLETE_LOG';
  const weeklyHint =
    daysLeft > 0 ? (progress.remainingKg / (daysLeft / 7)).toFixed(2) : null;
  const showRecovery =
    !comeback &&
    (score?.status === 'NEEDS_ATTENTION' || score?.status === 'INCOMPLETE_LOG');
  const focus = settings.focusMode;
  const priorities = focusPriorities(settings, agg, briefing.primaryAction);

  const openQuick = (mode: Exclude<QuickLogMode, null>) => {
    setQuickMode(mode);
    setQuickOpen(true);
  };

  const doPrimary = () => {
    const mapped = mapQuick(briefing.quickAction);
    if (mapped === 'nightly') {
      setNightlyOpen(true);
      return;
    }
    if (mapped === 'workout') {
      void navigate('/log?tab=workout');
      return;
    }
    openQuick(mapped);
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="greeting">
        <strong>{timeGreeting()}.</strong> Day {daysIn + 1} · {daysLeft} days to 15 Jan 2027 ·{' '}
        {trend.status === 'insufficient_data'
          ? 'Small actions. Consistent progress.'
          : 'Your next useful step starts here.'}
      </p>

      {comeback && comeback.missedDays >= 2 && (
        <section className="panel comeback-panel stack" aria-labelledby="comeback-title">
          <h2 id="comeback-title" style={{ fontSize: 'var(--text-lg)' }}>
            {comeback.message}
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {comeback.missedDays} days since your last log
            {comeback.lastLoggedDate ? ` (${comeback.lastLoggedDate})` : ''}. {comeback.nextStep}
          </p>
          <button type="button" className="btn btn-primary" onClick={doPrimary}>
            Take the next useful step
          </button>
        </section>
      )}

      {!focus && (
        <header className="panel panel-hero hero">
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
              size={120}
              stroke={10}
            />
          </div>

          <div className="grid-metrics hero-metrics">
            <div className="metric">
              <div className="label">Current</div>
              <div className="value">
                {agg.primaryWeightKg ?? '—'}
                <span className="dim" style={{ fontSize: 'var(--text-sm)' }}>
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
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                Actual progress from {settings.startingWeightKg} kg baseline
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
            <p className="dim" style={{ fontSize: 'var(--text-caption)', marginTop: 8 }}>
              {weeklyHint != null && (
                <>
                  Linear pace ~{weeklyHint} kg/week — guide only
                  {Number(weeklyHint) > 0.9 ? '; ambitious — never crash diet to force it.' : '.'}{' '}
                </>
              )}
              <span aria-live="polite">{trend.message}</span>
            </p>
          </div>
        </header>
      )}

      {/* Daily Command Centre — one next action */}
      <section className="panel briefing" aria-labelledby="command-title">
        <p className="briefing-kicker">Right now</p>
        <h2 id="command-title" className="briefing-title">
          {briefing.primaryAction}
        </h2>
        <p className="briefing-narrative">{briefing.narrative}</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 14 }} onClick={doPrimary}>
          Do this now
        </button>
        <div className="command-remain" aria-label="Remaining today">
          <MetricChip
            label={
              briefing.foodProvisional || briefing.caloriesRemaining == null
                ? 'Calories left · est.'
                : 'Calories left'
            }
            value={briefing.caloriesRemaining == null ? '—' : String(briefing.caloriesRemaining)}
            status={briefing.foodProvisional ? 'provisional' : 'open'}
          />
          <MetricChip
            label="Protein left"
            value={
              briefing.proteinRemaining == null
                ? '—'
                : `${Math.max(0, briefing.proteinRemaining)} g`
            }
          />
          <MetricChip
            label="Steps left"
            value={
              briefing.stepsRemaining == null ? '—' : briefing.stepsRemaining.toLocaleString()
            }
          />
          <MetricChip label="Water left" value={`${briefing.waterRemaining} ml`} />
        </div>
      </section>

      {focus && (
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
        </section>
      )}

      <section className="panel">
        <div className="section-head">
          <h2>Quick log</h2>
          <p className="muted">Thumb reach · few taps</p>
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
          <Link className="btn" to="/progress">
            Progress proof
          </Link>
        </div>
      </section>

      {!focus && (
        <section className="panel">
          <div className="section-head">
            <h2>Today</h2>
            <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_FRIENDLY[status]}</span>
          </div>
          <div className="grid-metrics">
            <MetricChip
              label="Steps"
              value={`${agg.steps ?? '—'} / ${settings.stepsTarget}`}
              progress={agg.steps == null ? null : agg.steps / settings.stepsTarget}
              status={agg.steps != null && agg.steps >= settings.stepsTarget ? 'done' : 'open'}
            />
            <MetricChip
              label="Calories"
              value={
                agg.foodEntryCount === 0
                  ? 'Not logged'
                  : `${Math.round(agg.calories)} / ${settings.calorieTarget}`
              }
              progress={
                agg.foodEntryCount === 0 ? null : Math.min(1, agg.calories / settings.calorieTarget)
              }
              status={
                agg.foodEntryCount === 0
                  ? 'open'
                  : agg.honestyAnswered
                    ? 'done'
                    : 'provisional'
              }
              detail={agg.foodEntryCount > 0 && !agg.honestyAnswered ? 'Honesty check open' : undefined}
            />
            <MetricChip
              label="Protein"
              value={
                agg.foodEntryCount === 0
                  ? '—'
                  : `${Math.round(agg.proteinG)} / ${settings.proteinTargetG} g`
              }
              progress={
                agg.foodEntryCount === 0
                  ? null
                  : Math.min(1, agg.proteinG / settings.proteinTargetG)
              }
              status={agg.proteinG >= settings.proteinTargetG * 0.9 ? 'done' : 'open'}
            />
            <MetricChip
              label="Water"
              value={`${agg.waterMl || '—'} / ${settings.waterTargetMl} ml`}
              progress={agg.waterMl === 0 ? null : Math.min(1, agg.waterMl / settings.waterTargetMl)}
              status={agg.waterMl >= settings.waterTargetMl ? 'done' : 'open'}
            />
            <MetricChip
              label="Workout"
              value={agg.workoutTypes.length ? agg.workoutTypes.join(', ') : 'Not logged'}
              status={agg.workoutTypes.length > 0 ? 'done' : 'open'}
            />
            <MetricChip
              label="Sleep"
              value={agg.sleepHours != null ? `${agg.sleepHours} h` : 'Not logged'}
              status={
                agg.sleepHours != null && agg.sleepHours >= settings.sleepTargetHours * 0.85
                  ? 'done'
                  : 'open'
              }
            />
            <MetricChip
              label="Cigarettes"
              value={agg.cigarettesLogged ? String(agg.cigaretteCount) : 'Not logged'}
              status={
                agg.cigarettesLogged && agg.cigaretteCount <= settings.cigaretteTarget
                  ? 'done'
                  : 'open'
              }
            />
            <MetricChip
              label="Score"
              value={`${score?.total ?? 0} / 100`}
              progress={(score?.total ?? 0) / 100}
              status={(score?.total ?? 0) >= 70 ? 'done' : 'open'}
            />
          </div>
          <p className="dim" style={{ fontSize: 'var(--text-caption)', marginTop: 12 }}>
            Blank logs stay blank. An honest estimate beats a perfect-looking guess.
          </p>
        </section>
      )}

      {showRecovery && (
        <section className="panel">
          <div className="section-head">
            <h2>Gentle recovery</h2>
            <p className="muted">Information, not a verdict</p>
          </div>
          <div className="stack">
            {recovery.map((r) => (
              <div key={r.id} className="metric">
                <strong>{r.title}</strong>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
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

