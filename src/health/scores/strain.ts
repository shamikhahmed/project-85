/** Tanaka et al. 2001 HRmax estimate; Edwards TRIMP zone weights; PROJECT 85 strain scale 0–21. */
export const STRAIN_K = 45;
export const STRAIN_CITATION =
  'HRmax: Tanaka H et al. J Am Coll Cardiol 2001. TRIMP zones: Edwards S. High performance training and racing. 1993. Strain mapping: PROJECT 85 (not medical).';

export type HrSample = { at: string; bpm: number };

export type StrainInputs = {
  age: number;
  hrMaxOverride?: number | null;
  hrSamples?: HrSample[];
  steps?: number | null;
};

export type ZoneMinutes = {
  z1: number;
  z2: number;
  z3: number;
  z4: number;
  z5: number;
};

export type StrainResult = {
  trimp: number;
  strain: number;
  zoneMinutes: ZoneMinutes;
  hrMax: number;
  estimatedFromSteps: boolean;
};

export function hrMaxFromAge(age: number, override?: number | null): number {
  if (override != null && override > 0) return override;
  return 208 - 0.7 * age;
}

function zoneIndex(pctHrMax: number): 0 | 1 | 2 | 3 | 4 | -1 {
  if (pctHrMax < 50) return -1;
  if (pctHrMax < 60) return 0;
  if (pctHrMax < 70) return 1;
  if (pctHrMax < 80) return 2;
  if (pctHrMax < 90) return 3;
  return 4;
}

const ZONE_WEIGHTS = [1, 2, 3, 4, 5] as const;

/** Minutes between consecutive HR samples (last segment omitted). */
function sampleDurations(samples: HrSample[]): number[] {
  if (samples.length < 2) return samples.length === 1 ? [1] : [];
  const sorted = [...samples].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  const durations: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const dt =
      (new Date(sorted[i + 1]!.at).getTime() - new Date(sorted[i]!.at).getTime()) / 60000;
    durations.push(Math.min(5, Math.max(0.5, dt)));
  }
  durations.push(durations[durations.length - 1] ?? 1);
  return durations;
}

export function edwardsTrimp(hrSamples: HrSample[], hrMax: number): { trimp: number; zoneMinutes: ZoneMinutes } {
  const sorted = [...hrSamples].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  const durations = sampleDurations(sorted);
  const zoneMinutes: ZoneMinutes = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  let trimp = 0;

  sorted.forEach((s, i) => {
    const pct = (s.bpm / hrMax) * 100;
    const zi = zoneIndex(pct);
    if (zi < 0) return;
    const mins = durations[i] ?? 1;
    const keys = ['z1', 'z2', 'z3', 'z4', 'z5'] as const;
    const ziKey = keys[zi as 0 | 1 | 2 | 3 | 4];
    zoneMinutes[ziKey] += mins;
    trimp += mins * ZONE_WEIGHTS[zi as 0 | 1 | 2 | 3 | 4];
  });

  return { trimp, zoneMinutes };
}

/** Steps-only estimate when no HR: ~1 TRIMP per 800 steps (light movement). */
export function trimpFromSteps(steps: number): number {
  if (steps <= 0) return 0;
  return steps / 800;
}

export function strainFromTrimp(trimp: number, k: number = STRAIN_K): number {
  const strain = 21 * (1 - Math.exp(-trimp / k));
  return Math.min(21, Math.max(0, Math.round(strain * 10) / 10));
}

export function computeStrain(input: StrainInputs): StrainResult {
  const hrMax = hrMaxFromAge(input.age, input.hrMaxOverride);
  const samples = input.hrSamples ?? [];

  if (samples.length > 0) {
    const { trimp, zoneMinutes } = edwardsTrimp(samples, hrMax);
    return {
      trimp,
      strain: strainFromTrimp(trimp),
      zoneMinutes,
      hrMax,
      estimatedFromSteps: false,
    };
  }

  const steps = input.steps ?? 0;
  const trimp = trimpFromSteps(steps);
  return {
    trimp,
    strain: strainFromTrimp(trimp),
    zoneMinutes: { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 },
    hrMax,
    estimatedFromSteps: steps > 0,
  };
}
