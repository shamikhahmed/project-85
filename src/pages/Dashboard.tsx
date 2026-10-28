import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MetricChip } from '../components/MetricChip';
import { ProgressRing } from '../components/ProgressRing';
import { QuickLogSheet, type QuickLogMode } from '../components/QuickLogSheet';
import { WeeklyReviewCard } from '../components/WeeklyReviewCard';
import * as repo from '../data/repository';
import { buildDailyBriefing, type QuickActionKind } from '../lib/briefing';
import { assessComeback, type ComebackState } from '../lib/comeback';
import {
  calendarDaysElapsed,
  calendarDaysRemaining,
  previousISODate,
  sleepDurationHours,
  toLocalISODate,
} from '../lib/dates';
import { buildRecoveryPlan } from '../lib/recovery';
import { assessWeightTrend } from '../lib/weightTrend';
import { useAppStore, useWeightProgress } from '../store/useAppStore';
import { calorieTargetFor, missionFor, planPhase, sessionFor, PLAN_START } from '../domain/plan';
import type { ISODate } from '../domain/types';

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
  const [yesterdaySleepHours, setYesterdaySleepHours] = useState<number | null>(null);
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
    void (async () => {
      const y = previousISODate(today);
      const sleep = await repo.getSleepByDate(y);
      if (!sleep) {
        setYesterdaySleepHours(null);
        return;
      }
      setYesterdaySleepHours(sleepDurationHours(sleep.bedtime, sleep.wakeTime));
    })();
  }, [today, agg?.sleepHours]);

  useEffect(() => {
    if (!settings) return;
    void (async () => {
      const start = settings.startDate;
      const days = await repo.loadAggregatesInRange(start, today);
      setComeback(assessComeback(days, today));
    })();
  }, [settings, today, agg?.loggingCompleteness, agg?.foodEntryCount, agg?.steps]);

  const trend = useMemo(() => assessWeightTrend(weightSeries), [weightSeries]);
  const previousWeightKg = useMemo(() => {
    const prior = weightSeries.filter((w) => w.date < today);
    return prior.at(-1)?.weightKg ?? null;
  }, [weightSeries, today]);
  const briefing = useMemo(() => {
    if (!settings || !agg) return null;
    return buildDailyBriefing({
      settings,
      agg,
      score,
      weightTrend: trend,
      yesterdaySleepHours,
      previousWeightKg,
    });
  }, [settings, agg, score, trend, yesterdaySleepHours, previousWeightKg]);
  const recovery = useMemo(() => {
    if (!settings || !score) return [];
    return buildRecoveryPlan(score.breakdown, settings);
  }, [settings, score]);

  if (!ready || !settings || !agg || !progress || !briefing) {
    return (
      <div className="empty-state boot">
        <h2>
          PROJECT <span className="hero-brand-num">85</span>
        </h2>
        <p className="muted">Loading your private mission data on this device.</p>
      </div>
    );
  }

  const daysLeft = calendarDaysRemaining(settings.deadline, today);
  const daysIn = calendarDaysElapsed(settings.startDate, today);
  const status = score?.status ?? 'INCOMPLETE_LOG';
  const hasWeight = agg.primaryWeightKg != null || weightSeries.length > 0;
  const currentDisplay =
    agg.primaryWeightKg ?? weightSeries.at(-1)?.weightKg ?? null;
  const weeklyHint =
    hasWeight && daysLeft > 0 ? (progress.remainingKg / (daysLeft / 7)).toFixed(2) : null;
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

  const trendLine =
    trend.status === 'insufficient_data'
      ? 'Trend needs 5+ morning weigh-ins across a week.'
      : trend.message;

  return (
    <div className="stack page">
      <p className="greeting">
        <strong>{timeGreeting()}.</strong>{' '}
        {today < settings.startDate
          ? `Starts in ${calendarDaysElapsed(today, settings.startDate)} days · ${daysLeft} days to the birthday`
          : `Day ${daysIn + 1} · ${daysLeft} days left`}
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
          <div className="quick-primary" style={{ marginTop: 4 }}>
            <button type="button" className="btn btn-primary" onClick={() => openQuick('meal')}>
              Log a meal
            </button>
            <button type="button" className="btn" onClick={() => openQuick('weight')}>
              Log weight
            </button>
            <button type="button" className="btn" onClick={doPrimary}>
              Suggested step
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => openQuick('water')}>
              + Water
            </button>
          </div>
        </section>
      )}

      {/* Mission status — distinctive but honest when no weigh-in */}
      <header className="panel panel-hero hero">
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
            value={hasWeight ? progress.percentComplete : 0}
            awaiting={!hasWeight}
            label={hasWeight ? `${progress.percentComplete}%` : '—'}
            sublabel={hasWeight ? 'to target' : 'awaiting scale'}
            size={112}
            stroke={9}
          />
        </div>

        <div className="hero-stats" aria-label="Weight mission">
          <div className="hero-stat">
            <div className="label">Start</div>
            <div className="value mono">{settings.startingWeightKg}</div>
          </div>
          <div className="hero-stat">
            <div className="label">Now</div>
            <div className="value mono">{currentDisplay ?? '—'}</div>
          </div>
          <div className="hero-stat">
            <div className="label">Target</div>
            <div className="value mono">{settings.targetWeightKg}</div>
          </div>
          <div className="hero-stat">
            <div className="label">{hasWeight ? 'To go' : 'To lose'}</div>
            <div className="value mono">
              {hasWeight ? progress.remainingKg : progress.requiredLossKg}
            </div>
          </div>
        </div>

        <p className="hero-foot">
          {hasWeight ? (
            <>
              <strong>{progress.lostKg} kg lost</strong>
              {weeklyHint != null && (
                <>
                  {' '}
                  · pace ~{weeklyHint} kg/week guide
                  {Number(weeklyHint) > 0.9 ? ' (ambitious — never crash diet)' : ''}
                </>
              )}
              <br />
              {trendLine}
            </>
          ) : (
            <>
              No morning weight logged yet — progress stays blank until the first honest weigh-in.
              <br />
              {trendLine}
            </>
          )}
        </p>
      </header>

      <TodayTrainingPanel date={today} />

      <section className="panel" aria-label="Body & health">
        <div className="section-head">
          <div>
            <p className="briefing-kicker">Intelligence</p>
            <h2 className="briefing-title" style={{ fontSize: '1.1rem' }}>
              Body · Health · Story
            </h2>
          </div>
        </div>
        <div className="quick-secondary" style={{ borderTop: 'none', paddingTop: 4 }}>
          <Link to="/body">Body Intelligence</Link>
          <Link to="/physique">Body Map</Link>
          <Link to="/health">Health sources</Link>
          <Link to="/timeline">Timeline</Link>
          <Link to="/motivation">Motivation</Link>
        </div>
        <p className="muted" style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}>
          Food & water stay optional — shown as not logged when empty. Wearables need native
          bridges (see Health).
        </p>
      </section>

      {/* Daily Mission — one win */}
      <section className="panel briefing" aria-labelledby="command-title">
        <p className="briefing-kicker">
          Daily Mission · {briefing.dayKindLabel}
        </p>
        <h2 id="command-title" className="briefing-title">
          {briefing.missionTitle}
        </h2>
        <p className="briefing-narrative">{briefing.narrative}</p>
        {briefing.trendTruth && (
          <p className="proof-win" style={{ marginTop: 12, fontSize: 'var(--text-sm)' }}>
            {briefing.trendTruth}
          </p>
        )}
        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={doPrimary}>
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
          <p className="muted">Few taps</p>
        </div>
        <div className="quick-primary">
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
        </div>
        <div className="quick-secondary">
          <Link to="/log?tab=workout">Workout</Link>
          <Link to="/log?tab=smoking">Cigarettes</Link>
          <Link to="/log?tab=sleep">Sleep</Link>
          <button type="button" onClick={() => setNightlyOpen(true)}>
            Nightly check
          </button>
          <Link to="/progress">Full progress</Link>
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
                  ? 'Not tracked'
                  : `${Math.round(agg.calories)} / ${calorieTargetFor(settings, agg.date)}`
              }
              progress={
                agg.foodEntryCount === 0 ? null : Math.min(1, agg.calories / calorieTargetFor(settings, agg.date))
              }
              status={
                agg.foodEntryCount === 0
                  ? 'open'
                  : agg.honestyAnswered
                    ? 'done'
                    : 'provisional'
              }
              detail={
                agg.foodEntryCount > 0 && !agg.honestyAnswered ? 'Honesty check open' : undefined
              }
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
              value={
                agg.waterMl === 0
                  ? 'Not tracked'
                  : `${agg.waterMl} / ${settings.waterTargetMl} ml`
              }
              progress={agg.waterMl === 0 ? null : Math.min(1, agg.waterMl / settings.waterTargetMl)}
              status={agg.waterMl >= settings.waterTargetMl ? 'done' : 'open'}
            />
          </div>
          <div className="quick-secondary" style={{ borderTop: 'none', paddingTop: 8, marginTop: 4 }}>
            <span className="dim" style={{ fontSize: 'var(--text-caption)' }}>
              Workout {agg.workoutTypes.length ? agg.workoutTypes.join(', ') : '—'} · Sleep{' '}
              {agg.sleepHours != null ? `${agg.sleepHours} h` : '—'} · Cigs{' '}
              {agg.cigarettesLogged ? agg.cigaretteCount : '—'} · Score {score?.total ?? 0}/100
            </span>
            <Link to="/discipline">Review detail</Link>
          </div>
        </section>
      )}

      {showRecovery && recovery.length > 0 && (
        <section className="panel">
          <div className="section-head">
            <h2>Gentle recovery</h2>
            <p className="muted">Information, not a verdict</p>
          </div>
          <div className="stack">
            {recovery.slice(0, 2).map((r) => (
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

      <WeeklyReviewCard compact />

      <QuickLogSheet
        open={quickOpen}
        initialMode={quickMode}
        onClose={() => setQuickOpen(false)}
      />
    </div>
  );
}

function TodayTrainingPanel({ date }: { date: ISODate }) {
  const session = sessionFor(date);
  const phase = planPhase(date);
  const mission = missionFor(date < PLAN_START ? PLAN_START : date);
  return (
    <section className="panel stack" aria-labelledby="train-today-title">
      <div className="section-head">
        <div>
          <p className="briefing-kicker">
            {phase.phase === 'Before start' ? 'Starts Tue 3 Nov' : `Week ${phase.week} · ${phase.mode}`}
          </p>
          <h2 id="train-today-title" className="briefing-title" style={{ fontSize: '1.25rem' }}>
            {date < PLAN_START ? 'First session: Push' : session.label}
            {session.note && date >= PLAN_START ? ` · ${session.note}` : ''}
          </h2>
        </div>
        <Link className="btn btn-primary" to="/train">
          Open
        </Link>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        <strong>Week {mission.week} mission:</strong> {mission.text}
      </p>
    </section>
  );
}
