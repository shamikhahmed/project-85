/**
 * PROJECT 85 Health Profile — transparent domain scores.
 *
 * This is NOT a proprietary biological-age formula (WHOOP Healthspan / Bevel / Levine
 * PhenoAge require either protected weights or clinical lab panels we do not have).
 * Numerical "biological age in years" stays gated until a published, reproducible model
 * can be implemented with available inputs.
 *
 * Domain scores use simple documented thresholds vs personal targets / common adult
 * ranges. They are wellness indicators, not diagnoses.
 */

export interface DomainInput {
  chronologicalAgeYears: number | null;
  sleepHoursAvg7: number | null;
  sleepTargetHours: number;
  stepsAvg7: number | null;
  stepsTarget: number;
  restingHrBpm: number | null;
  hrvMsAvg7: number | null;
  weightTrendKgPerWeek: number | null;
  vo2Max: number | null;
  bmi: number | null;
}

export interface DomainScore {
  id: string;
  label: string;
  score: number | null;
  max: 100;
  status: 'ok' | 'insufficient' | 'attention';
  explanation: string;
  inputsUsed: string[];
}

export interface HealthProfileResult {
  domains: DomainScore[];
  composite: number | null;
  completeness: number;
  biologicalAgeYears: null;
  biologicalAgeStatus: 'not_implemented';
  biologicalAgeReason: string;
  paceOfChange: {
    label: string;
    direction: 'improving' | 'stable' | 'worsening' | 'unknown';
    note: string;
  };
  generatedAt: string;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function sleepDomain(avg: number | null, target: number): DomainScore {
  if (avg == null) {
    return {
      id: 'sleep',
      label: 'Sleep',
      score: null,
      max: 100,
      status: 'insufficient',
      explanation: 'Need ≥ several nights of sleep duration.',
      inputsUsed: [],
    };
  }
  const ratio = avg / target;
  const score = Math.round(clamp(ratio * 100, 0, 100));
  return {
    id: 'sleep',
    label: 'Sleep',
    score,
    max: 100,
    status: score >= 70 ? 'ok' : 'attention',
    explanation: `7-day average ${avg} h vs target ${target} h.`,
    inputsUsed: ['sleepHoursAvg7', 'sleepTargetHours'],
  };
}

function activityDomain(avg: number | null, target: number): DomainScore {
  if (avg == null) {
    return {
      id: 'activity',
      label: 'Activity',
      score: null,
      max: 100,
      status: 'insufficient',
      explanation: 'Need step history across the week.',
      inputsUsed: [],
    };
  }
  const score = Math.round(clamp((avg / target) * 100, 0, 100));
  return {
    id: 'activity',
    label: 'Activity',
    score,
    max: 100,
    status: score >= 70 ? 'ok' : 'attention',
    explanation: `7-day average ${Math.round(avg)} steps vs target ${target}.`,
    inputsUsed: ['stepsAvg7', 'stepsTarget'],
  };
}

function recoveryDomain(rhr: number | null, hrv: number | null): DomainScore {
  if (rhr == null && hrv == null) {
    return {
      id: 'recovery',
      label: 'Recovery signals',
      score: null,
      max: 100,
      status: 'insufficient',
      explanation: 'Resting HR / HRV require a wearable import (not available in PWA alone).',
      inputsUsed: [],
    };
  }
  // Soft adult heuristic only — not clinical. Prefer mid-50s–70s RHR as calmer.
  let score = 50;
  const used: string[] = [];
  if (rhr != null) {
    used.push('restingHrBpm');
    if (rhr >= 50 && rhr <= 70) score += 25;
    else if (rhr > 70 && rhr <= 85) score += 10;
    else score -= 10;
  }
  if (hrv != null) {
    used.push('hrvMsAvg7');
    // Higher SDNN-ish ms generally better; no proprietary readiness claim
    if (hrv >= 40) score += 20;
    else if (hrv >= 25) score += 10;
  }
  score = Math.round(clamp(score, 0, 100));
  return {
    id: 'recovery',
    label: 'Recovery signals',
    score,
    max: 100,
    status: score >= 60 ? 'ok' : 'attention',
    explanation:
      'Heuristic from RHR/HRV when present. Not a readiness diagnosis; source recovery scores stay separate.',
    inputsUsed: used,
  };
}

function bodyDomain(bmi: number | null, trend: number | null): DomainScore {
  if (bmi == null && trend == null) {
    return {
      id: 'body',
      label: 'Body composition signals',
      score: null,
      max: 100,
      status: 'insufficient',
      explanation: 'Needs height + weight (BMI) and/or weight trend.',
      inputsUsed: [],
    };
  }
  let score = 50;
  const used: string[] = [];
  if (bmi != null) {
    used.push('bmi');
    // CDC screening bands — screening only
    if (bmi >= 18.5 && bmi < 25) score += 30;
    else if (bmi >= 25 && bmi < 30) score += 10;
    else score -= 5;
  }
  if (trend != null) {
    used.push('weightTrendKgPerWeek');
    // Gentle fat-loss pace favored for this mission
    if (trend <= -0.2 && trend >= -1.0) score += 20;
    else if (trend < -1.0) score += 5;
    else if (trend > 0.3) score -= 10;
  }
  score = Math.round(clamp(score, 0, 100));
  return {
    id: 'body',
    label: 'Body composition signals',
    score,
    max: 100,
    status: score >= 60 ? 'ok' : 'attention',
    explanation: 'BMI is a screening measure; trend uses logged weigh-ins only.',
    inputsUsed: used,
  };
}

function fitnessDomain(vo2: number | null, age: number | null): DomainScore {
  if (vo2 == null) {
    return {
      id: 'fitness',
      label: 'Cardio fitness',
      score: null,
      max: 100,
      status: 'insufficient',
      explanation: 'VO₂ max estimate requires Apple Health / Google Health import.',
      inputsUsed: [],
    };
  }
  // Very rough age-agnostic bands — not ACSM chart copy
  let score = 40;
  if (vo2 >= 45) score = 90;
  else if (vo2 >= 38) score = 75;
  else if (vo2 >= 32) score = 60;
  else if (vo2 >= 28) score = 45;
  else score = 30;
  return {
    id: 'fitness',
    label: 'Cardio fitness',
    score,
    max: 100,
    status: score >= 60 ? 'ok' : 'attention',
    explanation: `Device VO₂ estimate ${vo2} mL/kg·min${age != null ? ` (age ${age})` : ''} — not a lab test.`,
    inputsUsed: ['vo2Max'],
  };
}

export function buildHealthProfile(input: DomainInput): HealthProfileResult {
  const domains = [
    sleepDomain(input.sleepHoursAvg7, input.sleepTargetHours),
    activityDomain(input.stepsAvg7, input.stepsTarget),
    recoveryDomain(input.restingHrBpm, input.hrvMsAvg7),
    bodyDomain(input.bmi, input.weightTrendKgPerWeek),
    fitnessDomain(input.vo2Max, input.chronologicalAgeYears),
  ];

  const scored = domains.filter((d) => d.score != null) as (DomainScore & { score: number })[];
  const completeness = domains.length === 0 ? 0 : scored.length / domains.length;
  const composite =
    scored.length === 0
      ? null
      : Math.round(scored.reduce((a, d) => a + d.score, 0) / scored.length);

  let direction: HealthProfileResult['paceOfChange']['direction'] = 'unknown';
  let note = 'Need more longitudinal data to describe pace of change.';
  if (input.weightTrendKgPerWeek != null) {
    if (input.weightTrendKgPerWeek < -0.15) {
      direction = 'improving';
      note = 'Weight trend moving toward goal (logged weigh-ins). Not “reversed aging”.';
    } else if (input.weightTrendKgPerWeek > 0.2) {
      direction = 'worsening';
      note = 'Weight trend rising — review sleep, steps and intake honesty.';
    } else {
      direction = 'stable';
      note = 'Weight trend roughly flat recently.';
    }
  }

  return {
    domains,
    composite,
    completeness: Math.round(completeness * 100) / 100,
    biologicalAgeYears: null,
    biologicalAgeStatus: 'not_implemented',
    biologicalAgeReason:
      'No numerical biological age is shown. Published models either need clinical labs (e.g. PhenoAge) or use proprietary weights (e.g. WHOOP Healthspan). PROJECT 85 ships a transparent Health Profile instead.',
    paceOfChange: {
      label: 'Pace of change',
      direction,
      note,
    },
    generatedAt: new Date().toISOString(),
  };
}
