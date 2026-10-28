import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as repo from '../data/repository';
import type { BodyMeasurement } from '../domain/types';
import {
  ageFromBirthYear,
  buildBodyIntelligence,
} from '../lib/bodyMetrics';
import { assessWeightTrend } from '../lib/weightTrend';
import { useAppStore, useWeightProgress } from '../store/useAppStore';

function MetricBlock({
  label,
  value,
  hint,
  estimate,
}: {
  label: string;
  value: string;
  hint?: string;
  estimate?: boolean;
}) {
  return (
    <div className="bi-metric">
      <div className="label">
        {label}
        {estimate ? ' · estimate' : ''}
      </div>
      <div className="bi-value mono">{value}</div>
      {hint ? <p className="muted bi-hint">{hint}</p> : null}
    </div>
  );
}

export function BodyIntelligencePage() {
  const settings = useAppStore((s) => s.settings);
  const agg = useAppStore((s) => s.todayAgg);
  const progress = useWeightProgress();
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [weights, setWeights] = useState<{ date: string; weightKg: number }[]>([]);

  useEffect(() => {
    void (async () => {
      setMeasurements(await repo.getAllBodyMeasurements());
      const all = await repo.getAllWeights();
      setWeights(
        all.filter((w) => w.isPrimaryMorning).map((w) => ({ date: w.date, weightKg: w.weightKg })),
      );
    })();
  }, [agg?.primaryWeightKg]);

  const latestOf = (type: BodyMeasurement['type']) => {
    const rows = measurements.filter((m) => m.type === type).sort((a, b) => a.date.localeCompare(b.date));
    return rows.at(-1)?.valueCm ?? null;
  };

  const bi = useMemo(() => {
    if (!settings) return null;
    const heightCm = settings.heightCm ?? latestOf('height');
    const waistCm =
      latestOf('waist_natural') ?? latestOf('waist_navel') ?? agg?.waistCm ?? null;
    const neckCm = latestOf('neck');
    const hipCm = latestOf('hips');
    const latest = useAppStore.getState().latestWeightKg;
    const weightKg = agg?.primaryWeightKg ?? latest;
    return buildBodyIntelligence(
      {
        weightKg,
        heightCm,
        biologicalSex: settings.biologicalSex,
        ageYears: ageFromBirthYear(settings.birthYear),
        waistCm,
        neckCm,
        hipCm,
        stepsToday: agg?.steps ?? null,
        stepsTarget: settings.stepsTarget,
      },
      settings.targetWeightKg,
    );
  }, [settings, measurements, agg]);

  const trend = useMemo(() => assessWeightTrend(weights), [weights]);

  if (!settings || !bi || !progress) return null;

  return (
    <div className="stack page">
      <header className="panel page-header">
        <p className="briefing-kicker">PROJECT 85 · Body Intelligence</p>
        <h1>Your numbers, explained.</h1>
        <p className="muted">
          Recalculates when weight, height, sex, age or tape inputs change. Estimates are never
          labelled as lab measurements. Profile fields live in{' '}
          <Link to="/settings">Settings</Link>; tape history in <Link to="/physique">Body Map</Link>.
        </p>
      </header>

      <section className="panel bi-grid" aria-label="Key metrics">
        <MetricBlock
          label="Current weight"
          value={bi.updatedInputs.weightKg != null ? `${bi.updatedInputs.weightKg} kg` : '—'}
          hint="Latest saved morning weigh-in"
        />
        <MetricBlock
          label="Target weight"
          value={`${settings.targetWeightKg} kg`}
          hint="Goal set in profile"
        />
        <MetricBlock
          label="BMI"
          value={bi.bmi != null ? String(bi.bmi) : '—'}
          hint={
            bi.bmiCategory ??
            'Needs height + weight — set height in Settings or Body Map'
          }
        />
        <MetricBlock
          label="Weight to goal"
          value={bi.weightToGoalKg != null ? `${bi.weightToGoalKg} kg` : '—'}
          hint="Based on saved values"
        />
        <MetricBlock
          label="BMR"
          value={bi.bmrKcal != null ? `${bi.bmrKcal} kcal` : '—'}
          hint={bi.bmrFormula}
          estimate
        />
        <MetricBlock
          label="Estimated TDEE"
          value={bi.tdeeKcal != null ? `${bi.tdeeKcal} kcal` : '—'}
          hint={`${bi.activityLabel} · ${bi.activityConfidence === 'steps_hint' ? 'steps-hinted' : 'default factor'}`}
          estimate
        />
        <MetricBlock
          label="Suggested calorie floor"
          value={bi.suggestedCalorieFloor != null ? `${bi.suggestedCalorieFloor} kcal` : '—'}
          hint="Soft floor ~1.2× BMR — not a crash diet"
          estimate
        />
        <MetricBlock
          label="Protein guide"
          value={bi.suggestedProteinG != null ? `${bi.suggestedProteinG} g` : '—'}
          hint="~1.8 g/kg body weight (guide)"
          estimate
        />
        <MetricBlock
          label="Waist-to-height"
          value={bi.waistToHeight != null ? String(bi.waistToHeight) : '—'}
          hint="From latest natural/navel waist ÷ height"
        />
        <MetricBlock
          label="Body-fat estimate"
          value={bi.bodyFatPctEstimate != null ? `${bi.bodyFatPctEstimate}%` : '—'}
          hint={bi.bodyFatFormula ?? 'Needs sex + neck + waist (+ hips for female)'}
          estimate
        />
        <MetricBlock
          label="Lean mass estimate"
          value={bi.leanMassKgEstimate != null ? `${bi.leanMassKgEstimate} kg` : '—'}
          hint="Only when a body-fat estimate exists"
          estimate
        />
        <MetricBlock
          label="7-day weight trend"
          value={
            trend.avg7ChangeKg != null
              ? `${trend.avg7ChangeKg > 0 ? '+' : ''}${trend.avg7ChangeKg} kg / week-ish`
              : 'Insufficient data'
          }
          hint={trend.message}
        />
      </section>

      <section className="panel stack">
        <h2>Transparency</h2>
        <ul className="plain-list">
          {bi.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="muted">
          Inputs — height: {bi.updatedInputs.heightCm ?? 'missing'} cm · age:{' '}
          {bi.updatedInputs.ageYears ?? 'missing'} · sex: {bi.updatedInputs.biologicalSex}
        </p>
      </section>
    </div>
  );
}
