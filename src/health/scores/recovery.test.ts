import { describe, expect, it } from 'vitest';
import { assertSingleHrvKind, computeRecovery, type RecoveryDayInput } from './recovery';

function history7(): RecoveryDayInput[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: `2026-10-${String(20 + i).padStart(2, '0')}`,
    hrv: { value: 44 + i * 2, kind: 'sdnn' as const },
    rhr: 58 + (i % 4),
    sleepPerf: 0.78 + i * 0.02,
  }));
}

describe('computeRecovery', () => {
  it('calibrates until 7 baseline days', () => {
    const res = computeRecovery(
      { date: '2026-10-28', hrv: { value: 50, kind: 'sdnn' }, rhr: 60, sleepPerf: 0.9 },
      history7().slice(0, 4),
    );
    expect(res.status).toBe('calibrating');
    if (res.status === 'calibrating') expect(res.day).toBe(4);
  });

  it('scores near 50 when at personal baseline', () => {
    const hist = history7();
    const meanHrv = hist.reduce((s, d) => s + d.hrv!.value, 0) / hist.length;
    const meanRhr = hist.reduce((s, d) => s + d.rhr!, 0) / hist.length;
    const meanSleep = hist.reduce((s, d) => s + d.sleepPerf!, 0) / hist.length;
    const res = computeRecovery(
      {
        date: '2026-10-28',
        hrv: { value: meanHrv, kind: 'sdnn' },
        rhr: meanRhr,
        sleepPerf: meanSleep,
      },
      hist,
    );
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      expect(res.score).toBeGreaterThanOrEqual(45);
      expect(res.score).toBeLessThanOrEqual(55);
      expect(res.band).toBe('amber');
    }
  });

  it('goes green when HRV is well above baseline', () => {
    const hist = history7();
    const res = computeRecovery(
      { date: '2026-10-28', hrv: { value: 90, kind: 'sdnn' }, rhr: 54, sleepPerf: 0.98 },
      hist,
    );
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      expect(res.score).toBeGreaterThanOrEqual(67);
      expect(res.band).toBe('green');
    }
  });

  it('flags drag when sleep pulls score down', () => {
    const hist = history7();
    const res = computeRecovery(
      { date: '2026-10-28', hrv: { value: 56, kind: 'sdnn' }, rhr: 60, sleepPerf: 0.35 },
      hist,
    );
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      expect(res.score).toBeLessThanOrEqual(33);
      expect(res.band).toBe('red');
      expect(res.drag?.input).toBe('sleep');
    }
  });

  it('never mixes SDNN and RMSSD in baseline helper', () => {
    const mixed: RecoveryDayInput[] = [
      { date: '2026-10-20', hrv: { value: 50, kind: 'sdnn' } },
      { date: '2026-10-21', hrv: { value: 40, kind: 'rmssd' } },
    ];
    expect(assertSingleHrvKind(mixed)).toBe(false);
    expect(assertSingleHrvKind(history7())).toBe(true);
  });
});
