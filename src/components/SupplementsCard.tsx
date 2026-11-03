import { Link } from 'react-router-dom';
import * as repo from '../data/repository';
import { groupByTiming, toggleTaken } from '../domain/supplements';
import { useAppStore } from '../store/useAppStore';

/** Today: tap to tick each supplement in the stack. */
export function SupplementsCard({ date }: { date: string }) {
  const settings = useAppStore((s) => s.settings);
  const refreshSettings = useAppStore((s) => s.refreshSettings);
  if (!settings) return null;
  const stack = settings.supplements ?? [];
  const taken = new Set((settings.supplementLog?.[date] ?? []).map((n) => n.toLowerCase()));

  const toggle = async (name: string) => {
    await repo.updateSettings({ supplementLog: toggleTaken(settings.supplementLog, date, name) });
    await refreshSettings();
  };

  return (
    <section className="panel stack" aria-labelledby="supps-title">
      <div className="section-head">
        <h2 id="supps-title" style={{ fontSize: 'var(--text-lg)' }}>
          Supplements
        </h2>
        {stack.length > 0 && (
          <span className="dim" style={{ fontSize: 'var(--text-caption)' }}>
            {stack.filter((s) => taken.has(s.name.toLowerCase())).length}/{stack.length} taken
          </span>
        )}
      </div>
      {stack.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No stack yet. <Link to="/settings#supplements">Add creatine, whey or vitamins in Settings</Link> and
          tick them off here each day.
        </p>
      ) : (
        groupByTiming(stack).map((g) => (
          <div key={g.timing} className="supp-group">
            <span className="label">{g.label}</span>
            <div className="supp-chips">
              {g.items.map((s) => {
                const on = taken.has(s.name.toLowerCase());
                return (
                  <button
                    key={s.name}
                    type="button"
                    className={`supp-chip${on ? ' on' : ''}`}
                    aria-pressed={on}
                    onClick={() => void toggle(s.name)}
                  >
                    {on ? '✓ ' : ''}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
