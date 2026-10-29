/** Aspenes et al. 2011 HUNT VO2peak means (Table 2), used for fitness-age inversion. */
export const FITNESS_AGE_CITATION =
  'Aspenes ST et al. Med Sci Sports Exerc 2011;43(11):2024–2030 (HUNT Study, Table 2). Fitness-age framing: Nes BM et al. Mayo Clin Proc 2013.';

const MALE_AGES = [25, 35, 45, 55, 65, 75] as const;
const MALE_MEANS = [54.0, 48.8, 46.7, 42.1, 38.5, 34.1] as const;
const FEMALE_AGES = [25, 35, 45, 55, 65, 75] as const;
const FEMALE_MEANS = [42.9, 39.8, 37.9, 33.7, 30.6, 26.5] as const;

export type FitnessSex = 'male' | 'female' | 'other' | null;

function tableForSex(sex: FitnessSex): { ages: readonly number[]; means: readonly number[] } {
  if (sex === 'female') return { ages: FEMALE_AGES, means: FEMALE_MEANS };
  // male, other, or unknown → male reference table
  return { ages: MALE_AGES, means: MALE_MEANS };
}

/** Piecewise-linear invert: VO2 → age at which population mean equals vo2. Clamped 20–90. */
export function fitnessAgeFromVo2(vo2: number, sex: FitnessSex): number | null {
  if (!Number.isFinite(vo2) || vo2 <= 0) return null;
  const { ages, means } = tableForSex(sex);
  if (vo2 >= means[0]!) return ages[0]!;
  if (vo2 <= means[means.length - 1]!) return ages[ages.length - 1]!;

  for (let i = 0; i < means.length - 1; i++) {
    const hi = means[i]!;
    const lo = means[i + 1]!;
    if (vo2 <= hi && vo2 >= lo) {
      const ageHi = ages[i]!;
      const ageLo = ages[i + 1]!;
      const t = (hi - vo2) / (hi - lo);
      const age = ageHi + t * (ageLo - ageHi);
      return Math.min(90, Math.max(20, age));
    }
  }
  return null;
}

export type Vo2Sample = { at: string; vo2: number };

/** Median VO2 (mL/kg/min) from samples within the last 30 local days ending at `asOf`. */
export function medianVo2Last30Days(
  samples: Vo2Sample[],
  asOf: string = new Date().toISOString(),
): number | null {
  const end = new Date(asOf).getTime();
  const windowStart = end - 30 * 24 * 60 * 60 * 1000;
  const values = samples
    .filter((s) => {
      const t = new Date(s.at).getTime();
      return t >= windowStart && t <= end && Number.isFinite(s.vo2);
    })
    .map((s) => s.vo2)
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 1 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2;
}
