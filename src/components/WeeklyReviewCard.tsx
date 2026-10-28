import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as repo from '../data/repository';
import { rollingWeekBounds, toLocalISODate } from '../lib/dates';
import { buildWeeklyReview, type WeeklyReviewSummary } from '../lib/weeklyReview';
import { useAppStore } from '../store/useAppStore';

interface Props {
  /** Compact teaser for Today; full card elsewhere. */
  compact?: boolean;
}

export function WeeklyReviewCard({ compact = false }: Props) {
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
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Weekly review</h2>
        <p className="muted">Loading this week’s trends…</p>
      </section>
    );
  }

  if (compact) {
    return (
      <section className="panel" aria-labelledby="weekly-teaser-title">
        <div className="weekly-teaser">
          <div>
            <h2 id="weekly-teaser-title" style={{ fontSize: 'var(--text-lg)' }}>
              This week
            </h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
              {summary.headline}
            </p>
            {summary.suggestions[0] && (
              <p className="dim" style={{ margin: '8px 0 0', fontSize: 'var(--text-footnote)' }}>
                Next: {summary.suggestions[0]}
              </p>
            )}
            <p style={{ margin: '10px 0 0' }}>
              <Link to="/progress" className="muted" style={{ fontWeight: 600, fontSize: 'var(--text-footnote)' }}>
                Open progress proof →
              </Link>
            </p>
          </div>
          <div className="weekly-teaser-meta" aria-label="Week snapshot">
            <div>
              <strong>{summary.daysWithAnyLog}/7</strong>
              logged
            </div>
            <div>
              <strong>{summary.avgSteps?.toLocaleString() ?? '—'}</strong>
              avg steps
            </div>
            <div>
              <strong>
                {summary.weightChangeKg != null
                  ? `${summary.weightChangeKg > 0 ? '+' : ''}${summary.weightChangeKg}`
                  : '—'}
              </strong>
              kg Δ
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel stack" aria-labelledby="weekly-review-title">
      <div className="section-head">
        <div>
          <h2 id="weekly-review-title" style={{ fontSize: 'var(--text-lg)' }}>
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
          <div className="value" style={{ fontSize: 'var(--text-md)' }}>
            {summary.daysWithAnyLog}/7
          </div>
        </div>
        <div className="metric">
          <div className="label">Avg steps</div>
          <div className="value" style={{ fontSize: 'var(--text-md)' }}>
            {summary.avgSteps?.toLocaleString() ?? '—'}
          </div>
        </div>
        <div className="metric">
          <div className="label">Step hit %</div>
          <div className="value" style={{ fontSize: 'var(--text-md)' }}>
            {summary.stepHitRate != null ? `${summary.stepHitRate}%` : '—'}
          </div>
        </div>
        <div className="metric">
          <div className="label">Avg protein</div>
          <div className="value" style={{ fontSize: 'var(--text-md)' }}>
            {summary.avgProtein != null ? `${summary.avgProtein} g` : '—'}
          </div>
        </div>
        <div className="metric">
          <div className="label">Workouts</div>
          <div className="value" style={{ fontSize: 'var(--text-md)' }}>
            {summary.workouts}
          </div>
        </div>
        <div className="metric">
          <div className="label">Weight Δ</div>
          <div className="value" style={{ fontSize: 'var(--text-md)' }}>
            {summary.weightChangeKg != null
              ? `${summary.weightChangeKg > 0 ? '+' : ''}${summary.weightChangeKg} kg`
              : '—'}
          </div>
        </div>
      </div>
      <p className="dim" style={{ fontSize: 'var(--text-footnote)', margin: 0 }}>
        Weight Δ is first vs last logged morning in this window (missing days are not invented) —
        not a fat-gain verdict. Prefer the 7-day average on Progress.
      </p>
      <div>
        <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: 8 }}>One or two adjustments</h3>
        <ul className="briefing-list">
          {summary.suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
