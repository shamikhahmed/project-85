import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import * as repo from '../data/repository';
import { LIBRARY_MUSCLE_INDEX } from '../domain/exerciseLibrary';
import { muscleRecovery } from '../domain/muscleRecovery';
import { buildWorkout, readinessFrom, type BuildResult } from '../domain/workoutBuilder';
import { BUILDER_KEY, parseBuilder, type BuilderState } from '../domain/builderState';
import type { WorkoutEntry } from '../domain/types';
import { parseLocalDate, toLocalISODate } from '../lib/dates';

function readStored(): BuilderState {
  try {
    const raw = localStorage.getItem(BUILDER_KEY);
    return parseBuilder(raw ? JSON.parse(raw) : null);
  } catch {
    return parseBuilder(null);
  }
}

/** Builder state, today's recovery and the session it builds — shared by the Build and Library tabs. */
export function useWorkoutBuilder(shoulderCaution: boolean) {
  const today = toLocalISODate();
  const [state, setState] = useState<BuilderState>(readStored);
  const [history, setHistory] = useState<WorkoutEntry[]>([]);
  const from = format(addDays(parseLocalDate(today), -120), 'yyyy-MM-dd');

  const reload = useCallback(async () => {
    setHistory(await repo.getWorkoutsInRange(from, today));
  }, [from, today]);

  useEffect(() => {
    let cancelled = false;
    void repo.getWorkoutsInRange(from, today).then((rows) => {
      if (!cancelled) setHistory(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [from, today]);

  useEffect(() => {
    try {
      localStorage.setItem(BUILDER_KEY, JSON.stringify(state));
    } catch {
      /* private mode: the session just isn't remembered */
    }
  }, [state]);

  const liveReadiness = useMemo(
    () => readinessFrom(muscleRecovery(history, new Date(), LIBRARY_MUSCLE_INDEX)),
    [history],
  );

  const result = useMemo<BuildResult | null>(
    () =>
      state.picks.length
        ? buildWorkout({
            picks: state.picks,
            setting: state.setting,
            sets: state.sets,
            supersets: state.supersets,
            seed: state.seed,
            pinned: state.pinned,
            avoid: state.avoid,
            shoulderCaution,
            // A built session keeps the recovery it was built with, so logging a set never reshuffles it.
            readiness: state.built ? state.readiness : liveReadiness,
            cardio: state.cardio,
          })
        : null,
    [state, shoulderCaution, liveReadiness],
  );

  return { state, setState, result, liveReadiness, history, reload, today, shoulderCaution };
}

export type BuilderApi = ReturnType<typeof useWorkoutBuilder>;
