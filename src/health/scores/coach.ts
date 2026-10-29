import type { RecoveryBand } from './recovery';

export const LOW_STRAIN_THRESHOLD = 10;
export const LOW_SLEEP_HOURS_FORCE_BASIC = 6.5;

export function recoveryBandFromScore(score: number): RecoveryBand {
  if (score >= 67) return 'green';
  if (score >= 34) return 'amber';
  return 'red';
}

export function coachLine(recoveryScore: number, strain: number): string {
  const band = recoveryBandFromScore(recoveryScore);
  if (band === 'red') {
    return 'Go Basic, add 20 min walk.';
  }
  if (band === 'green' && strain <= LOW_STRAIN_THRESHOLD) {
    return 'Push today: Advanced mode.';
  }
  if (band === 'green') {
    return 'Green recovery — match intensity to today’s strain.';
  }
  return 'Steady day: Basic or moderate work, protect sleep tonight.';
}

export function shouldForceBasic(
  recoveryScore: number,
  _strain: number,
  sleepHours: number,
): boolean {
  if (recoveryBandFromScore(recoveryScore) === 'red') return true;
  if (sleepHours < LOW_SLEEP_HOURS_FORCE_BASIC) return true;
  return false;
}
