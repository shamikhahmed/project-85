import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WATER_QUICK_ADDS } from '../domain/defaults';
import type { FoodLibraryItem } from '../domain/types';
import * as repo from '../data/repository';
import { toLocalISODate } from '../lib/dates';
import { useAppStore } from '../store/useAppStore';

export type QuickLogMode = 'meal' | 'water' | 'steps' | 'weight' | null;

interface Props {
  open: boolean;
  initialMode?: QuickLogMode;
  onClose: () => void;
}

/**
 * Fast path for common logs. Target: saved meal in ≤4 interactions after open.
 * Meal list → tap item → logged (2 taps). Water: pick amount (1). Steps/weight: value + save.
 */
export function QuickLogSheet({ open, initialMode = 'meal', onClose }: Props) {
  const library = useAppStore((s) => s.foodLibrary);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const refreshDay = useAppStore((s) => s.refreshDay);
  const setToast = useAppStore((s) => s.setToast);
  const settings = useAppStore((s) => s.settings);
  const agg = useAppStore((s) => s.todayAgg);

  const [mode, setMode] = useState<Exclude<QuickLogMode, null>>('meal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState('');
  const [weight, setWeight] = useState('');
  const [query, setQuery] = useState('');
  const savingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode && initialMode !== null ? initialMode : 'meal');
    setError(null);
    setQuery('');
    setSteps(agg?.steps != null ? String(agg.steps) : '');
    setWeight(agg?.primaryWeightKg != null ? String(agg.primaryWeightKg) : '');
  }, [open, initialMode, agg?.steps, agg?.primaryWeightKg]);

  const meals = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...library].sort((a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name));
    if (!q) return sorted.slice(0, 16);
    return sorted.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 16);
  }, [library, query]);

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refreshDay();
      setToast(okMsg);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save — try again';
      setError(msg);
      setToast(msg);
    } finally {
      setBusy(false);
      savingRef.current = false;
    }
  };

  const logMeal = (item: FoodLibraryItem) =>
    void run(async () => {
      await repo.addFood({
        date: selectedDate,
        category: item.category,
        name: item.name,
        portion: item.defaultPortion,
        calories: item.calories,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        fibreG: item.fibreG,
        confidence: item.confidence,
        libraryItemId: item.id,
        enteredLate: selectedDate !== toLocalISODate(),
      });
    }, `Logged ${item.name}`);

  const addWater = (ml: number) =>
    void run(async () => {
      await repo.addWater(selectedDate, ml);
    }, `+${ml} ml water`);

  const saveSteps = () => {
    const n = Math.round(Number(steps));
    if (!Number.isFinite(n) || n < 0 || n > 200000) {
      setError('Enter a realistic step total (0–200000)');
      return;
    }
    void run(async () => {
      await repo.setStepsForDate(selectedDate, n);
    }, 'Steps saved (replaced day’s total)');
  };

  const saveWeight = () => {
    const n = Number(weight);
    if (!Number.isFinite(n) || n < 40 || n > 300) {
      setError('Enter a realistic weight in kg');
      return;
    }
    void run(async () => {
      await repo.upsertPrimaryWeight({
        date: selectedDate,
        weightKg: n,
        isEstimate: false,
        enteredLate: selectedDate !== toLocalISODate(),
      });
    }, 'Weight saved');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ql-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ql-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) onClose();
          }}
        >
          <motion.div
            className="ql-sheet panel"
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
          >
            <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 id="ql-title" style={{ fontSize: '1.15rem' }}>
                  Quick Log
                </h2>
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  {selectedDate} · saved to this device
                </p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                Close
              </button>
            </div>

            <div className="ql-modes" role="tablist" aria-label="Quick log type">
              {(
                [
                  ['meal', 'Meal'],
                  ['water', 'Water'],
                  ['steps', 'Steps'],
                  ['weight', 'Weight'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  className={`ql-mode${mode === id ? ' active' : ''}`}
                  onClick={() => {
                    setMode(id);
                    setError(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {error && (
              <p className="badge badge-warn" role="alert">
                {error}
              </p>
            )}

            {mode === 'meal' && (
              <div className="stack" style={{ gap: 10 }}>
                <label>
                  <span className="sr-only">Search meals</span>
                  <input
                    className="input"
                    placeholder="Search library (tikka, chapati…)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <p className="dim" style={{ margin: 0, fontSize: '0.8rem' }}>
                  One tap logs the saved meal as-is. Estimates stay labelled estimated.
                </p>
                <div className="ql-meal-list">
                  {meals.length === 0 && (
                    <p className="muted">No matching meals — add one in the Log → Food library.</p>
                  )}
                  {meals.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="ql-meal"
                      disabled={busy}
                      onClick={() => logMeal(item)}
                    >
                      <span className="ql-meal-name">{item.name}</span>
                      <span className="dim" style={{ fontSize: '0.75rem' }}>
                        {item.calories} kcal · P{item.proteinG} · {item.confidence}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'water' && (
              <div className="stack">
                <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                  Today: {agg?.waterMl ?? 0} / {settings?.waterTargetMl ?? 3000} ml
                </p>
                <div className="quick-grid">
                  {WATER_QUICK_ADDS.map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => addWater(ml)}
                    >
                      +{ml} ml
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'steps' && (
              <div className="stack">
                <p className="dim" style={{ margin: 0, fontSize: '0.85rem' }}>
                  Enter today’s total — this replaces the saved number (does not add).
                </p>
                <label>
                  <span className="label">Steps</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={steps}
                    onChange={(e) => setSteps(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </label>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={saveSteps}>
                  Save steps
                </button>
              </div>
            )}

            {mode === 'weight' && (
              <div className="stack">
                <p className="dim" style={{ margin: 0, fontSize: '0.85rem' }}>
                  One measurement doesn’t tell the whole story — trends use your rolling average.
                </p>
                <label>
                  <span className="label">Weight (kg)</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </label>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={saveWeight}>
                  Save weight
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
