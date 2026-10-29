import { describe, expect, it } from 'vitest';
import {
  albumin_gDlTo_gL,
  crp_mgLTo_mgDl,
  phenoAgeFromLabs,
  phenoAgeFromUsUnits,
} from './phenoAge';

/** Hand-computed reference panel (SI inputs); expected phenoAge ≈ 46.64y. */
const REFERENCE_SI = {
  albumin_gL: 42,
  creatinine_umolL: 97.24,
  glucose_mmolL: 4.78,
  crp_mgDl: 0.02,
  lymphocytePct: 28,
  mcv: 90,
  rdw: 13.2,
  alp: 70,
  wbc: 6.5,
  chronologicalAge: 53,
};

describe('phenoAgeFromLabs', () => {
  it('matches hand-calculated reference within 0.1 years', () => {
    expect(phenoAgeFromLabs(REFERENCE_SI)).toBeCloseTo(46.64, 1);
  });

  it('converts US units consistently', () => {
    const fromUs = phenoAgeFromUsUnits({
      albumin_gDl: 4.2,
      creatinine_mgDl: 1.1,
      glucose_mgDl: 86,
      crp_mgL: 0.2,
      lymphocytePct: 28,
      mcv: 90,
      rdw: 13.2,
      alp: 70,
      wbc: 6.5,
      chronologicalAge: 53,
    });
    expect(fromUs).toBeCloseTo(46.64, 1);
  });
});

describe('unit converters', () => {
  it('albumin g/dL ↔ g/L', () => {
    expect(albumin_gDlTo_gL(4.2)).toBe(42);
  });

  it('CRP mg/L ↔ mg/dL', () => {
    expect(crp_mgLTo_mgDl(0.2)).toBeCloseTo(0.02, 5);
  });
});
