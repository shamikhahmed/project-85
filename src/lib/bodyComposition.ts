/**
 * Optional formula-based body composition estimates.
 * NEVER label these as direct measurements or DXA equivalents.
 */

export interface NavyBodyFatInput {
  sex: 'male' | 'female';
  heightCm: number;
  neckCm: number;
  /** Prefer natural or navel waist — caller chooses */
  waistCm: number;
  /** Required for female Navy formula */
  hipCm?: number;
}

/**
 * US Navy circumference method (cm inputs converted to inches for the classic formula).
 * Returns percent body fat estimate or null if inputs incomplete/implausible.
 */
export function estimateNavyBodyFatPct(input: NavyBodyFatInput): number | null {
  const { sex, heightCm, neckCm, waistCm, hipCm } = input;
  if (heightCm < 120 || neckCm < 20 || waistCm < 40) return null;

  const h = heightCm / 2.54;
  const n = neckCm / 2.54;
  const w = waistCm / 2.54;

  let density: number;
  if (sex === 'male') {
    if (w - n <= 0) return null;
    density =
      1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h);
  } else {
    if (hipCm == null || hipCm < 40) return null;
    const hip = hipCm / 2.54;
    if (w + hip - n <= 0) return null;
    density =
      1.29579 - 0.35004 * Math.log10(w + hip - n) + 0.221 * Math.log10(h);
  }

  if (!Number.isFinite(density) || density <= 0) return null;
  const bf = 495 / density - 450;
  if (!Number.isFinite(bf) || bf < 2 || bf > 60) return null;
  return Math.round(bf * 10) / 10;
}

export function estimateLeanMassKg(
  weightKg: number,
  bodyFatPct: number,
): number | null {
  if (weightKg < 30 || bodyFatPct < 2 || bodyFatPct > 60) return null;
  return Math.round(weightKg * (1 - bodyFatPct / 100) * 10) / 10;
}
