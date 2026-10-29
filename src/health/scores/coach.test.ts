import { describe, expect, it } from 'vitest';
import { coachLine, shouldForceBasic } from './coach';

describe('coachLine', () => {
  it('pushes advanced on green + low strain', () => {
    expect(coachLine(70, 8)).toBe('Push today: Advanced mode.');
  });

  it('sends Basic on red recovery', () => {
    expect(coachLine(30, 5)).toBe('Go Basic, add 20 min walk.');
  });
});

describe('shouldForceBasic', () => {
  it('forces Basic for red recovery or short sleep', () => {
    expect(shouldForceBasic(30, 5, 7)).toBe(true);
    expect(shouldForceBasic(70, 5, 6)).toBe(true);
    expect(shouldForceBasic(70, 5, 7)).toBe(false);
  });
});
