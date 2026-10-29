import { describe, expect, it } from 'vitest';
import { localCalendarDay } from './localDay';

describe('localCalendarDay', () => {
  it('respects explicit timezone offset in ISO string', () => {
    expect(localCalendarDay('2026-10-28T02:30:00+05:00')).toBe('2026-10-28');
    expect(localCalendarDay('2026-10-27T23:00:00+05:00')).toBe('2026-10-27');
  });

  it('does not use UTC date slice for offset timestamps', () => {
    // Same instant as 2026-10-27T21:30:00.000Z in +05:00
    expect(localCalendarDay('2026-10-28T02:30:00+05:00')).not.toBe('2026-10-27');
  });
});
