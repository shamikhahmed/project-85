import { describe, expect, it } from 'vitest';
import { assessWeightTrend, dailyWeightVsTrendMessage } from './weightTrend';

const day = (n: number) => `2026-11-${String(n).padStart(2, '0')}`;
const series = (vals: number[], startDay = 1) =>
  vals.map((weightKg, i) => ({ date: day(startDay + i), weightKg }));

describe('assessWeightTrend', () => {
  it('needs at least 5 weigh-ins', () => {
    const r = assessWeightTrend(series([96, 95.8, 95.6, 95.5]));
    expect(r.status).toBe('insufficient_data');
    expect(r.avg7ChangeKg).toBeNull();
  });

  it('needs at least 7 days of span even with 5+ entries', () => {
    const r = assessWeightTrend(series([96, 95.8, 95.6, 95.5, 95.4, 95.3]));
    expect(r.status).toBe('insufficient_data');
  });

  it('ignores invalid weights and dedupes same-day entries', () => {
    const r = assessWeightTrend([
      ...series([96, 96, 96, 96]),
      { date: day(5), weightKg: Number.NaN },
      { date: day(1), weightKg: 96.1 },
    ]);
    expect(r.status).toBe('insufficient_data');
  });

  it('detects a downward 7-day average over 14 days', () => {
    const vals = [97, 96.9, 97.1, 96.8, 96.9, 97, 96.8, 96.2, 96.1, 96.3, 96, 96.1, 96.2, 95.9];
    const r = assessWeightTrend(series(vals));
    expect(r.status).toBe('trending_down');
    expect(r.avg7ChangeKg).toBeLessThan(-0.2);
  });

  it('detects an upward trend with cautious wording', () => {
    const vals = [95, 95.1, 95, 95.2, 95.1, 95, 95.1, 95.6, 95.7, 95.8, 95.6, 95.7, 95.8, 95.7];
    const r = assessWeightTrend(series(vals));
    expect(r.status).toBe('trending_up');
    expect(r.message).toMatch(/longer trend|before changing the plan/i);
    expect(r.message).not.toMatch(/fail/i);
  });

  it('calls a short flat average stable, not a plateau or failure', () => {
    const vals = [95, 95.2, 94.9, 95.1, 95, 95.1, 95.0, 95.1, 94.9, 95, 95.2, 95, 95.1, 95];
    const r = assessWeightTrend(series(vals));
    expect(r.status).toBe('stable');
    expect(r.message).not.toMatch(/plateau|fail/i);
  });

  it('labels a longer flat span as plateau without panic language', () => {
    const vals = Array.from({ length: 22 }, (_, i) => 95 + ((i % 3) - 1) * 0.05);
    const r = assessWeightTrend(series(vals));
    expect(r.status).toBe('plateau');
    expect(r.message).toMatch(/flat|plateau/i);
    expect(r.message).not.toMatch(/fail|punish/i);
  });

  it('explains daily up vs downward weekly trend', () => {
    const vals = [97, 96.9, 97.1, 96.8, 96.9, 97, 96.8, 96.2, 96.1, 96.3, 96, 96.1, 96.2, 95.9];
    const trend = assessWeightTrend(series(vals));
    const msg = dailyWeightVsTrendMessage({
      todayKg: 96.5,
      previousKg: 95.9,
      trend,
    });
    expect(msg).toMatch(/up|don’t panic|longer-term/i);
  });

  it('labels big day-to-day swings as noisy', () => {
    const vals = [95, 97, 94.5, 96.8, 94.7, 97, 94.6, 96.9, 94.8, 97, 94.5];
    const r = assessWeightTrend(series(vals));
    expect(r.status).toBe('noisy');
    expect(r.message).not.toMatch(/plateau|fail/i);
  });

  it('falls back to half-vs-half when the earlier week is thin', () => {
    // 5 entries across 8 days: only latest week has >=2 and earlier has 1
    const r = assessWeightTrend([
      { date: day(1), weightKg: 97 },
      { date: day(5), weightKg: 96.6 },
      { date: day(6), weightKg: 96.5 },
      { date: day(8), weightKg: 96.3 },
      { date: day(9), weightKg: 96.2 },
    ]);
    expect(r.status).toBe('trending_down');
    expect(r.avg7ChangeKg).not.toBeNull();
  });

  it('respects asOf and never uses future entries', () => {
    const vals = [97, 96.9, 97.1, 96.8, 96.9, 97, 96.8, 90, 90, 90, 90];
    const r = assessWeightTrend(series(vals), { asOf: day(7) });
    expect(r.status).toBe('insufficient_data');
  });
});
