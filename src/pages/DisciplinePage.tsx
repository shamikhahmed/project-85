import { CONSEQUENCE_CATALOG } from '../domain/defaults';
import { useAppStore } from '../store/useAppStore';
import * as repo from '../data/repository';
import { ProgressRing } from '../components/ProgressRing';

const OUTCOME_LABEL = {
  achieved: 'Achieved',
  missed_honest: 'Missed (honest)',
  not_entered: 'Not entered',
  not_applicable: 'N/A',
} as const;

export function DisciplinePage() {
  const score = useAppStore((s) => s.todayScore);
  const agg = useAppStore((s) => s.todayAgg);
  const settings = useAppStore((s) => s.settings);
  const refreshDay = useAppStore((s) => s.refreshDay);
  const setNightlyOpen = useAppStore((s) => s.setNightlyOpen);
  const setToast = useAppStore((s) => s.setToast);
  const selectedDate = useAppStore((s) => s.selectedDate);

  if (!score || !settings || !agg) return null;

  const consequences = CONSEQUENCE_CATALOG.filter((c) =>
    score.consequenceIds.includes(c.id),
  );

  return (
    <div className="stack">
      <header className="panel page-header">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <h1>Review</h1>
            <p className="muted">
              Firm, direct, supportive — missed targets are information, not a verdict
            </p>
          </div>
          <ProgressRing
            value={score.total}
            label={`${score.total}`}
            sublabel="score"
            color={score.total >= 70 ? 'var(--success)' : 'var(--accent)'}
          />
        </div>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 12 }}>
          Missing logs never count as success. Starvation cannot score as a calorie win. Honesty
          and recovery still earn XP.
        </p>
      </header>

      <section className="panel">
        <h2 style={{ fontSize: '1.05rem' }}>Today’s breakdown</h2>
        <div className="stack" style={{ marginTop: 12 }}>
          {(Object.keys(score.breakdown) as (keyof typeof score.breakdown)[]).map((key) => (
            <div key={key} className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong style={{ textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1')}
                </strong>
                <div className="dim" style={{ fontSize: '0.75rem' }}>
                  weight {settings.scoreWeights[key]}
                </div>
              </div>
              <div className="row">
                <span
                  className={`badge ${
                    score.breakdown[key] === 'achieved'
                      ? 'badge-ok'
                      : score.breakdown[key] === 'not_entered'
                        ? 'badge-info'
                        : 'badge-warn'
                  }`}
                >
                  {OUTCOME_LABEL[score.breakdown[key]]}
                </span>
                <span className="mono">{score.points[key]} pts</span>
              </div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          XP earned today: <strong className="mono">{score.xpEarned}</strong> (honesty & recovery
          credited)
        </p>
      </section>

      <section className="panel stack">
        <h2 style={{ fontSize: '1.05rem' }}>Constructive consequences</h2>
        <p className="dim" style={{ margin: 0, fontSize: '0.85rem' }}>
          Never: skip meals, crash cuts, dehydration, punishment workouts, sleep loss, or
          financial penalties by default.
        </p>
        {consequences.length === 0 ? (
          <p className="badge badge-ok">No open consequences — keep the streak honest.</p>
        ) : (
          consequences.map((c) => (
            <div key={c.id} className="metric">
              <strong>{c.title}</strong>
              <p className="muted" style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
                {c.description}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="panel stack">
        <h2 style={{ fontSize: '1.05rem' }}>Nightly Truth Check</h2>
        <p className="muted" style={{ margin: 0 }}>
          Wind-down check-in: honest answers help the score reflect reality — one day never
          resets your progress.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setNightlyOpen(true)}>
          Open Nightly Truth Check
        </button>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await repo.upsertNotes(selectedDate, { dailyReviewCompleted: true });
            setToast('Daily review marked complete');
            await refreshDay();
          }}
        >
          Mark daily review complete
        </button>
      </section>

      <section className="panel">
        <h2 style={{ fontSize: '1.05rem' }}>Achievements & streaks</h2>
        <p className="dim" style={{ fontSize: '0.85rem' }}>
          Welcome back anytime — previous effort still counts. Missed days may pause a streak
          counter, but historical achievements are never wiped.
        </p>
        <div className="grid-metrics" style={{ marginTop: 12 }}>
          <div className="metric">
            <div className="label">Honesty</div>
            <div className="value" style={{ fontSize: '1rem' }}>
              {agg.honestyAnswered ? 'Logged' : 'Open'}
            </div>
          </div>
          <div className="metric">
            <div className="label">Status</div>
            <div className="value" style={{ fontSize: '0.95rem' }}>
              {score.status.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
