import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CONSEQUENCE_CATALOG } from '../domain/defaults';
import * as repo from '../data/repository';
import { useAppStore } from '../store/useAppStore';

export function NightlyTruthCheck() {
  const open = useAppStore((s) => s.nightlyOpen);
  const setOpen = useAppStore((s) => s.setNightlyOpen);
  const agg = useAppStore((s) => s.todayAgg);
  const score = useAppStore((s) => s.todayScore);
  const settings = useAppStore((s) => s.settings);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const refreshDay = useAppStore((s) => s.refreshDay);
  const setToast = useAppStore((s) => s.setToast);

  const [honestFood, setHonestFood] = useState<boolean | null>(null);
  const [stepsTruth, setStepsTruth] = useState('');
  const [waterHonest, setWaterHonest] = useState<boolean | null>(null);
  const [cigs, setCigs] = useState('');
  const [trained, setTrained] = useState<boolean | null>(null);
  const [better, setBetter] = useState('');

  if (!settings || !agg) return null;

  const missActions: string[] = [];
  if (agg.steps == null || (agg.steps ?? 0) < settings.stepsTarget) {
    missActions.push(CONSEQUENCE_CATALOG.find((c) => c.id === 'plan_walks')!.description);
  }
  if (!agg.honestyAnswered || agg.foodEntryCount === 0) {
    missActions.push(CONSEQUENCE_CATALOG.find((c) => c.id === 'backfill_food')!.description);
  }
  if (agg.proteinG < settings.proteinTargetG * 0.9 && agg.foodEntryCount > 0) {
    missActions.push(CONSEQUENCE_CATALOG.find((c) => c.id === 'protein_plan')!.description);
  }
  if (agg.cigarettesLogged && agg.cigaretteCount > settings.cigaretteTarget) {
    missActions.push(CONSEQUENCE_CATALOG.find((c) => c.id === 'smoking_trigger')!.description);
  }

  const finish = async () => {
    if (stepsTruth.trim()) {
      const n = Math.round(Number(stepsTruth));
      if (Number.isFinite(n) && n >= 0) await repo.setStepsForDate(selectedDate, n);
    }
    if (cigs.trim() !== '') {
      const n = Math.round(Number(cigs));
      if (n === 0) await repo.logZeroCigarettes(selectedDate);
      else if (n > 0) {
        await repo.addCigarette({
          date: selectedDate,
          count: n,
          substance: 'tobacco',
          cravingNote: 'Nightly truth check',
        });
      }
    }
    if (trained === false) {
      await repo.upsertWorkout({
        date: selectedDate,
        type: 'rest',
        notes: 'Nightly truth: planned recovery / rest',
      });
    }
    await repo.upsertNotes(selectedDate, {
      ...(honestFood !== null ? { loggedEverythingHonestly: honestFood } : {}),
      improveTomorrow: better || undefined,
      eveningReview: [
        `Food honest: ${honestFood}`,
        `Water honest: ${waterHonest}`,
        `Trained/recovery: ${trained}`,
        better ? `Better tomorrow: ${better}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      nightlyTruthCompleted: true,
      dailyReviewCompleted: true,
    });
    await refreshDay();
    setToast('Truth locked in. Tomorrow gets one practical action — journey continues.');
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ntc-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ntc-title"
        >
          <motion.div
            className="ntc-panel panel"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 id="ntc-title" style={{ fontSize: '1.2rem' }}>
                Nightly Truth Check
              </h2>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              Be as accurate as you can. Gaps get one practical action for tomorrow — never
              skip meals, dehydration, extra punishment workouts, lost sleep, or money penalties.
            </p>

            <Q label="Did I log everything I ate today, including the little things?">
              <YesNo value={honestFood} onChange={setHonestFood} />
            </Q>
            <Q
              label={`Did I reach my step goal (${settings.stepsTarget.toLocaleString()})? Enter today’s true total (replaces saved steps — no adding on top).`}
            >
              <input
                className="input"
                inputMode="numeric"
                placeholder={agg.steps != null ? String(agg.steps) : 'Steps today'}
                value={stepsTruth}
                onChange={(e) => setStepsTruth(e.target.value)}
              />
            </Q>
            <Q label="Did I record my water honestly?">
              <YesNo value={waterHonest} onChange={setWaterHonest} />
            </Q>
            <Q label="How many cigarettes did I smoke?">
              <input
                className="input"
                inputMode="numeric"
                placeholder={agg.cigarettesLogged ? String(agg.cigaretteCount) : '0 if none'}
                value={cigs}
                onChange={(e) => setCigs(e.target.value)}
              />
            </Q>
            <Q label="Did I train or follow my planned recovery day?">
              <YesNo value={trained} onChange={setTrained} />
            </Q>
            <Q label="What is one thing I need to do better tomorrow?">
              <textarea
                className="textarea"
                value={better}
                onChange={(e) => setBetter(e.target.value)}
              />
            </Q>

            {missActions.length > 0 && (
              <div className="metric">
                <strong>What happened → one action</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {missActions.slice(0, 2).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
                {score && (
                  <p className="dim" style={{ fontSize: '0.8rem', marginTop: 8 }}>
                    Today’s score after refresh will reflect honesty. Status:{' '}
                    {score.status.replace(/_/g, ' ')}.
                  </p>
                )}
              </div>
            )}

            <button type="button" className="btn btn-primary" onClick={() => void finish()}>
              Lock in the truth
            </button>
          </motion.div>

          <style>{`
            .ntc-backdrop {
              position: fixed; inset: 0; z-index: 60;
              background: rgba(0,0,0,0.72);
              display: grid; place-items: end center;
              padding: 16px;
            }
            @media (min-width: 720px) {
              .ntc-backdrop { place-items: center; }
            }
            .ntc-panel {
              width: min(560px, 100%);
              max-height: min(90dvh, 820px);
              overflow: auto;
              display: flex; flex-direction: column; gap: 14px;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Q({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
      {children}
    </div>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="row">
      <button
        type="button"
        className={`btn ${value === true ? 'btn-primary' : ''}`}
        onClick={() => onChange(true)}
      >
        Yes
      </button>
      <button
        type="button"
        className={`btn ${value === false ? 'btn-primary' : ''}`}
        onClick={() => onChange(false)}
      >
        No
      </button>
    </div>
  );
}
