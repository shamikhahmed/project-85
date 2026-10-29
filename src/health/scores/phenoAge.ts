/** Levine ME et al. Aging (Albany NY) 2018;10(4):573–591 — PhenoAge coefficients. */
export const PHENOAGE_CITATION =
  'Levine ME et al. An epigenetic biomarker of aging for lifespan and healthspan. Aging (Albany NY) 2018;10(4):573–591.';

export type PhenoAgeInputs = {
  albumin_gL: number;
  creatinine_umolL: number;
  glucose_mmolL: number;
  crp_mgDl: number;
  lymphocytePct: number;
  mcv: number;
  rdw: number;
  alp: number;
  wbc: number;
  chronologicalAge: number;
};

export function albumin_gDlTo_gL(gDl: number): number {
  return gDl * 10;
}

export function albumin_gLTo_gDl(gL: number): number {
  return gL / 10;
}

export function creatinine_mgDlTo_umolL(mgDl: number): number {
  return mgDl * 88.4;
}

export function creatinine_umolLTo_mgDl(umolL: number): number {
  return umolL / 88.4;
}

export function glucose_mgDlTo_mmolL(mgDl: number): number {
  return mgDl / 18;
}

export function glucose_mmolLTo_mgDl(mmolL: number): number {
  return mmolL * 18;
}

export function crp_mgLTo_mgDl(mgL: number): number {
  return mgL / 10;
}

export function crp_mgDlTo_mgL(mgDl: number): number {
  return mgDl * 10;
}

const GAMMA = 0.0076927;

function mortalityFromXb(xb: number): number {
  const term = (Math.exp(120 * GAMMA) - 1) / GAMMA;
  return 1 - Math.exp(-Math.exp(xb) * term);
}

/** Levine 2018 PhenoAge in years. Returns null if math domain is invalid. */
export function phenoAgeFromLabs(input: PhenoAgeInputs): number | null {
  const crp = Math.max(input.crp_mgDl, 0.01);
  const xb =
    -19.9067 -
    0.0336 * input.albumin_gL +
    0.0095 * input.creatinine_umolL +
    0.1953 * input.glucose_mmolL +
    0.0954 * Math.log(crp) -
    0.012 * input.lymphocytePct +
    0.0268 * input.mcv +
    0.3306 * input.rdw +
    0.0019 * input.alp +
    0.0554 * input.wbc +
    0.0804 * input.chronologicalAge;

  const mort = mortalityFromXb(xb);
  if (mort >= 1 || mort <= 0) return null;
  const inner = -0.00553 * Math.log(1 - mort);
  if (inner <= 0) return null;
  return 141.50225 + Math.log(inner) / 0.090165;
}

/** Build lab inputs from common US units. */
export function phenoAgeFromUsUnits(params: {
  albumin_gDl: number;
  creatinine_mgDl: number;
  glucose_mgDl: number;
  crp_mgL: number;
  lymphocytePct: number;
  mcv: number;
  rdw: number;
  alp: number;
  wbc: number;
  chronologicalAge: number;
}): number | null {
  return phenoAgeFromLabs({
    albumin_gL: albumin_gDlTo_gL(params.albumin_gDl),
    creatinine_umolL: creatinine_mgDlTo_umolL(params.creatinine_mgDl),
    glucose_mmolL: glucose_mgDlTo_mmolL(params.glucose_mgDl),
    crp_mgDl: crp_mgLTo_mgDl(params.crp_mgL),
    lymphocytePct: params.lymphocytePct,
    mcv: params.mcv,
    rdw: params.rdw,
    alp: params.alp,
    wbc: params.wbc,
    chronologicalAge: params.chronologicalAge,
  });
}
