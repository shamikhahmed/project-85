import { describe, expect, it } from 'vitest';
import { journalTagInsight } from './journalInsights';

describe('journalTagInsight', () => {
  it('requires at least 5 per group', () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      recovery: 60,
      tags: i < 3 ? ['late_meal'] : [],
    }));
    expect(journalTagInsight(entries, 'late_meal').status).toBe('insufficient_data');
  });

  it('reports mean difference with counts', () => {
    const entries = [
      ...Array.from({ length: 6 }, (_, i) => ({
        date: `2026-10-${String(i + 1).padStart(2, '0')}`,
        recovery: 50,
        tags: ['late_meal'] as string[],
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        date: `2026-10-${String(i + 10).padStart(2, '0')}`,
        recovery: 61,
        tags: [] as string[],
      })),
    ];
    const insight = journalTagInsight(entries, 'late_meal');
    expect(insight.status).toBe('ok');
    if (insight.status === 'ok') {
      expect(insight.diff).toBe(-11);
      expect(insight.nWith).toBe(6);
      expect(insight.nWithout).toBe(6);
    }
  });
});
