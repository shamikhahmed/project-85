import { useEffect, useState } from 'react';
import * as repo from '../data/repository';
import { rollingWeekBounds, toLocalISODate } from '../lib/dates';
import { buildWeeklyReview, type WeeklyReviewSummary } from '../lib/weeklyReview';
import { useAppStore } from '../store/useAppStore';

export function WeeklyReviewCard() {
  const settings = useAppStore((s) => s.settings);
  const todayAgg = useAppStore((s) => s.todayAgg);
  const [summary, setSummary] = useState<WeeklyReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!settings) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { weekStart, weekEnd } = rollingWeekBounds(toLocalISODate(), 7);
      const days = await repo.loadAggregatesInRange(weekStart, weekEnd);
      if (cancelled) return;
      setSummary(buildWeeklyReview(days, settings, weekStart, weekEnd));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    settings,
    todayAgg?.date,
    todayAgg?.loggingCompleteness,
    todayAgg?.calories,
    todayAgg?.steps,
    todayAgg?.proteinG,
    todayAgg?.primaryWeightKg,
    todayAgg?.workoutTypes,
    todayAgg?.honestyAnswered,
  ]);

  if (!settings) return null;

  if (loading || !summary) {
    return (
      <section className="panel">
        <h2 style={{ fontSize: '1.05rem' }}>Weekly review</h2>
        <p className="muted">Loading this week’s trends…</p>
      </section>
    );
  }

  return (
    <section className="panel stack" aria-labelledby="weekly-review-title">
      <div className="section-head">
        <div>
          <h2 id="weekly-review-title" style={{ fontSize: '1.05rem' }}>
            Weekly review
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {summary.weekStart} → {summary.weekEnd}
          </p>
        </div>
      </div>
      <p style={{ margin: 0, fontWeight: 650 }}>{summary.headline}</p>
      <div className="grid-metrics">
        <div className="metric">
          <div className="label">Days logged</div>
          <div className="value" style={{ fontSize: '1.1rem' }}>
            {summary.daysWithAnyLog}/7
          </div>
        </div>
        <div className="metric">
          <div className="label">Avg steps</div>
          <div className="value" style={{ fontSize: '1.1rem' }}>
            {summary.avgSteps?.toLocaleString() ?? '—'}
          </div>
        </div>
        <div className="metric">
          <div className="label">Step hit %</div>
          <div className="value" style={{ fontSize: '1.1rem' }}>
            {summary.stepHitRate != null ? `${summary.stepHitRate}%` : '—'}
          </div>
        </div>
        <div className="metric">
          <div className="label">Avg protein</div>
          <div className="value" style={{ fontSize: '1.1rem' }}>
            {summary.avgProtein != null ? `${summary.avgProtein} g` : '—'}
          </div>
        </div>
        <div className="metric">
          <div className="label">Workouts</div>
          <div className="value" style={{ fontSize: '1.1rem' }}>
            {summary.workouts}
          </div>
        </div>
        <div className="metric">
          <div className="label">Weight Δ</div>
          <div className="value" style={{ fontSize: '1.1rem' }}>
            {summary.weightChangeKg != null
              ? `${summary.weightChangeKg > 0 ? '+' : ''}${summary.weightChangeKg} kg`
              : '—'}
          </div>
        </div>
      </div>
      <p className="dim" style={{ fontSize: '0.8rem', margin: 0 }}>
        Weight Δ is first vs last logged morning in this window (missing days are not invented) —
        not a fat-gain verdict. Prefer the 7-day average on Trend.
      </p>
      <div>
        <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>One or two adjustments</h3>
        <ul className="briefing-list">
          {summary.suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
