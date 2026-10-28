import { create } from 'zustand';
import { buildDayAggregate } from '../lib/aggregates';
import { computeDayScore, nextActions } from '../lib/discipline';
import { computeWeightProgress } from '../lib/weightProgress';
import { toLocalISODate } from '../lib/dates';
import type {
  AppSettings,
  DayAggregate,
  DayScore,
  FoodLibraryItem,
} from '../domain/types';
import * as repo from '../data/repository';

interface AppState {
  ready: boolean;
  error: string | null;
  selectedDate: string;
  settings: AppSettings | null;
  todayAgg: DayAggregate | null;
  todayScore: DayScore | null;
  latestWeightKg: number | null;
  foodLibrary: FoodLibraryItem[];
  nextActions: string[];
  toast: string | null;
  nightlyOpen: boolean;

  init: () => Promise<void>;
  setDate: (date: string) => Promise<void>;
  refreshDay: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  setToast: (msg: string | null) => void;
  setNightlyOpen: (open: boolean) => void;
}

async function loadLatestPrimaryWeight(): Promise<number | null> {
  const all = await repo.getAllWeights();
  const primaries = all.filter((w) => w.isPrimaryMorning).sort((a, b) => b.date.localeCompare(a.date));
  return primaries[0]?.weightKg ?? null;
}

let refreshGeneration = 0;

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  selectedDate: toLocalISODate(),
  settings: null,
  todayAgg: null,
  todayScore: null,
  latestWeightKg: null,
  foodLibrary: [],
  nextActions: [],
  toast: null,
  nightlyOpen: false,

  setToast: (msg) => set({ toast: msg }),
  setNightlyOpen: (open) => set({ nightlyOpen: open }),

  init: async () => {
    try {
      const settings = await repo.ensureInitialized();
      const foodLibrary = await repo.getFoodLibrary();
      const latestWeightKg = await loadLatestPrimaryWeight();
      set({ settings, foodLibrary, latestWeightKg, ready: true, error: null });
      await get().refreshDay();
      // Mirror manual logs into canonical health store (non-blocking)
      void import('../health/syncEngine')
        .then((m) => m.syncManualIntoHealthStore())
        .catch(() => undefined);
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Storage unavailable',
        ready: true,
      });
    }
  },

  setDate: async (date) => {
    set({ selectedDate: date });
    await get().refreshDay();
  },

  refreshSettings: async () => {
    const settings = await repo.getSettings();
    set({ settings });
    await get().refreshDay();
  },

  refreshDay: async () => {
    const gen = ++refreshGeneration;
    const date = get().selectedDate;
    const bundle = await repo.loadDayBundle(date);
    if (gen !== refreshGeneration || get().selectedDate !== date) return;
    const agg = buildDayAggregate({
      date,
      settings: bundle.settings,
      weights: bundle.weights,
      foods: bundle.foods,
      steps: bundle.steps,
      water: bundle.water,
      workouts: bundle.workouts,
      sleep: bundle.sleep,
      cigarettes: bundle.cigarettes,
      notes: bundle.notes,
      score: bundle.score,
    });
    const score = computeDayScore({ date, settings: bundle.settings, agg });
    await repo.saveDayScore(score);
    if (gen !== refreshGeneration || get().selectedDate !== date) return;
    const latestWeightKg = await loadLatestPrimaryWeight();
    const foodLibrary = await repo.getFoodLibrary();
    if (gen !== refreshGeneration || get().selectedDate !== date) return;
    set({
      settings: bundle.settings,
      todayAgg: agg,
      todayScore: score,
      latestWeightKg,
      foodLibrary,
      nextActions: nextActions(agg, bundle.settings),
    });
  },
}));

export function useWeightProgress() {
  const settings = useAppStore((s) => s.settings);
  const latest = useAppStore((s) => s.latestWeightKg);
  if (!settings) return null;
  return computeWeightProgress({
    startingWeightKg: settings.startingWeightKg,
    targetWeightKg: settings.targetWeightKg,
    currentWeightKg: latest,
  });
}
