import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as repo from '../data/repository';
import { diagnoseAllConnections } from '../health/adapters';
import { buildHealthProfile } from '../health/healthProfile';
import { METRIC_REGISTRY } from '../health/metricRegistry';
import type { HealthConnectionState, MetricAvailability } from '../health/types';
import {
  JOURNAL_TAG_KEYS,
  type DailyScoreRow,
  type JournalTagRow,
  type LabPanel,
} from '../domain/types';
import { ageFromBirthYear, buildBodyIntelligence, computeBmi } from '../lib/bodyMetrics';
import { previousISODate, sleepDurationHours, toLocalISODate } from '../lib/dates';
import {
  FITNESS_AGE_CITATION,
  PHENOAGE_CITATION,
  albumin_gDlTo_gL,
  creatinine_mgDlTo_umolL,
  crp_mgLTo_mgDl,
  fitnessAgeFromVo2,
  glucose_mgDlTo_mmolL,
  journalTagInsight,
  medianVo2Last30Days,
  phenoAgeFromLabs,
  recoveryBandFromScore,
  type FitnessSex,
  type RecoveryResult,
} from '../health/scores';
import { assessWeightTrend } from '../lib/weightTrend';
import {
  checkNativeHealthAvailability,
  requestHealthAuthorization,
} from '../native/healthKitBridge';
import { runFullHealthSync } from '../health/syncEngine';
import { getGoogleHealthSetupStatus } from '../health/googleHealthClient';
import { useAppStore } from '../store/useAppStore';

const JOURNAL_LABELS: Record<(typeof JOURNAL_TAG_KEYS)[number], string> = {
  late_meal: 'Late meal',
  chai_after_4pm: 'Chai after 4pm',
  alcohol: 'Alcohol',
  screens_in_bed: 'Screens in bed',
  stress: 'Stress',
  sick: 'Sick',
};

function recoveryBadgeClass(score: number | null): string {
  if (score == null) return 'badge-info';
  const band = recoveryBandFromScore(score);
  if (band === 'green') return 'badge-ok';
  if (band === 'amber') return 'badge-warn';
  return 'badge-bad';
}

function parseDailyInputs(row: DailyScoreRow | undefined): {
  recovery: RecoveryResult | null;
  goToBedBy: string | null;
  hrvNote: string | null;
} {
  if (!row?.inputsJson) {
    return { recovery: null, goToBedBy: null, hrvNote: null };
  }
  try {
    const parsed = JSON.parse(row.inputsJson) as {
      recovery?: RecoveryResult;
      sleep?: { goToBedBy?: string };
      recoveryInput?: { hrv?: unknown };
    };
    const hrvNote =
      parsed.recoveryInput?.hrv == null && parsed.recovery?.status === 'ready'
        ? 'HRV not shared by Google Health. Recovery uses resting HR + sleep.'
        : null;
    return {
      recovery: parsed.recovery ?? null,
      goToBedBy: parsed.sleep?.goToBedBy ?? null,
      hrvNote,
    };
  } catch {
    return { recovery: null, goToBedBy: null, hrvNote: null };
  }
}

function parseLocalDateSafe(iso: string): Date {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function statusBadge(status: HealthConnectionState['status']): string {
  if (status === 'ok') return 'badge-ok';
  if (status === 'stale') return 'badge-warn';
  if (status === 'error' || status === 'blocked_credentials') return 'badge-warn';
  return 'badge-info';
}

function metricAvailability(
  metricId: string,
  connections: HealthConnectionState[],
  hasLocal: boolean,
): MetricAvailability {
  const cap = METRIC_REGISTRY.find((m) => m.id === metricId);
  if (!cap) return 'unavailable';
  if (hasLocal) return 'available';
  const supportsNative = cap.providers.some(
    (p) =>
      (p.support === 'requires_native' || p.support === 'via_hub') &&
      connections.some((c) => c.provider === p.provider && c.status === 'ok'),
  );
  if (supportsNative) return 'waiting';
  if (cap.providers.some((p) => p.support === 'requires_oauth')) {
    const g = connections.find((c) => c.provider === 'google_health');
    if (g?.status === 'blocked_credentials') return 'permission_needed';
  }
  if (cap.providers.some((p) => p.support === 'requires_native')) return 'unsupported';
  if (cap.providers.some((p) => p.provider === 'project85_estimate')) return 'estimated';
  return 'unavailable';
}

export function HealthIntelligencePage() {
  const settings = useAppStore((s) => s.settings);
  const agg = useAppStore((s) => s.todayAgg);
  const [connections, setConnections] = useState<HealthConnectionState[]>([]);
  const [weights, setWeights] = useState<{ date: string; weightKg: number }[]>([]);
  const [sleepAvg, setSleepAvg] = useState<number | null>(null);
  const [stepsAvg, setStepsAvg] = useState<number | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [labPanels, setLabPanels] = useState<LabPanel[]>([]);
  const [dailyRow, setDailyRow] = useState<DailyScoreRow | undefined>();
  const [journalRow, setJournalRow] = useState<JournalTagRow | undefined>();
  const [vo2Median, setVo2Median] = useState<number | null>(null);
  const [journalInsights, setJournalInsights] = useState<string[]>([]);
  const [phenoOpen, setPhenoOpen] = useState(false);
  const [labDate, setLabDate] = useState(toLocalISODate());
  const [labUnits, setLabUnits] = useState<'si' | 'us'>('si');
  const [labForm, setLabForm] = useState({
    albumin: '45',
    creatinine: '80',
    glucose: '5.2',
    crp: '0.3',
    lymphocytePct: '30',
    mcv: '90',
    rdw: '13',
    alp: '70',
    wbc: '6',
  });
  const setToast = useAppStore((s) => s.setToast);
  const today = toLocalISODate();
  const googleSetup = getGoogleHealthSetupStatus();

  useEffect(() => {
    void (async () => {
      await repo.refreshHealthConnectionDiagnostics();
      try {
        await runFullHealthSync();
      } catch {
        /* non-fatal — keep UI usable */
      }
      setConnections(await repo.listHealthConnections());
      const all = await repo.getAllWeights();
      setWeights(
        all.filter((w) => w.isPrimaryMorning).map((w) => ({ date: w.date, weightKg: w.weightKg })),
      );
      if (!settings) return;
      const today = toLocalISODate();
      let sleepSum = 0;
      let sleepN = 0;
      let stepSum = 0;
      let stepN = 0;
      let cursor = today;
      for (let i = 0; i < 7; i++) {
        const d = cursor;
        cursor = previousISODate(cursor);
        const sleep = await repo.getSleepByDate(d);
        if (sleep) {
          const h = sleepDurationHours(sleep.bedtime, sleep.wakeTime);
          if (h != null && h > 0) {
            sleepSum += h;
            sleepN += 1;
          }
        }
        const steps = await repo.getStepsByDate(d);
        if (steps) {
          stepSum += steps.totalSteps;
          stepN += 1;
        }
      }
      setSleepAvg(sleepN ? Math.round((sleepSum / sleepN) * 10) / 10 : null);
      setStepsAvg(stepN ? Math.round(stepSum / stepN) : null);

      setLabPanels(await repo.listLabPanels());
      setDailyRow(await repo.getDailyScore(today));
      setJournalRow(await repo.getJournalTags(today));

      const records = await repo.listHealthRecords();
      const vo2Samples = records
        .filter((r) => r.metricId === 'vo2_max' && !r.deletedAt)
        .map((r) => ({ at: r.startAt, vo2: r.value }));
      setVo2Median(medianVo2Last30Days(vo2Samples));

      const start = previousISODate(today);
      let cursorInsight = start;
      for (let i = 0; i < 89; i += 1) cursorInsight = previousISODate(cursorInsight);
      const tagsInRange = await repo.listJournalTagsInRange(cursorInsight, today);
      const insightEntries: { date: string; recovery: number; tags: string[] }[] = [];
      for (const t of tagsInRange) {
        const ds = await repo.getDailyScore(t.date);
        if (ds?.recovery != null) {
          insightEntries.push({ date: t.date, recovery: ds.recovery, tags: t.tags });
        }
      }
      const lines: string[] = [];
      if (insightEntries.length >= 14) {
        for (const tag of JOURNAL_TAG_KEYS) {
          const res = journalTagInsight(
            insightEntries.map((e) => ({
              date: e.date,
              recovery: e.recovery,
              tags: e.tags,
            })),
            tag,
          );
          if (res.status === 'ok') lines.push(res.message.replace(`Nights after ${tag}:`, `Nights after ${JOURNAL_LABELS[tag]}:`));
        }
      }
      setJournalInsights(lines);
    })();
  }, [settings, agg?.steps, agg?.sleepHours, agg?.primaryWeightKg, today]);

  const runSync = async () => {
    setSyncBusy(true);
    setSyncNote(null);
    try {
      const result = await runFullHealthSync();
      setConnections(await repo.refreshHealthConnectionDiagnostics());
      const msg = `Mirrored ${result.manualMirrored} local rows · Apple: ${result.apple.status}${
        result.apple.imported ? ` (${result.apple.imported} samples)` : ''
      }`;
      setSyncNote(msg);
      setToast('Health store synced');
    } catch (e) {
      setSyncNote(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncBusy(false);
    }
  };

  const connectApple = async () => {
    const avail = await checkNativeHealthAvailability();
    if (!avail.available) {
      setToast(avail.reason);
      setSyncNote(avail.reason);
      return;
    }
    const auth = await requestHealthAuthorization();
    setToast(auth.detail);
    setSyncNote(auth.detail);
    if (auth.ok) await runSync();
  };

  const trend = useMemo(() => assessWeightTrend(weights), [weights]);

  const profile = useMemo(() => {
    if (!settings) return null;
    const height = settings.heightCm;
    const weight = agg?.primaryWeightKg ?? useAppStore.getState().latestWeightKg;
    const bmi = height != null && weight != null ? computeBmi(weight, height) : null;
    return buildHealthProfile({
      chronologicalAgeYears: ageFromBirthYear(settings.birthYear),
      sleepHoursAvg7: sleepAvg,
      sleepTargetHours: settings.sleepTargetHours,
      stepsAvg7: stepsAvg,
      stepsTarget: settings.stepsTarget,
      restingHrBpm: null,
      hrvMsAvg7: null,
      weightTrendKgPerWeek: trend.avg7ChangeKg,
      vo2Max: null,
      bmi,
    });
  }, [settings, agg, sleepAvg, stepsAvg, trend.avg7ChangeKg]);

  const bodyIntel = useMemo(() => {
    if (!settings) return null;
    return buildBodyIntelligence(
      {
        weightKg: agg?.primaryWeightKg ?? useAppStore.getState().latestWeightKg,
        heightCm: settings.heightCm,
        biologicalSex: settings.biologicalSex,
        ageYears: ageFromBirthYear(settings.birthYear),
        stepsToday: agg?.steps ?? null,
        stepsTarget: settings.stepsTarget,
      },
      settings.targetWeightKg,
    );
  }, [settings, agg]);

  const chronoAge = ageFromBirthYear(settings?.birthYear ?? null);
  const fitnessSex: FitnessSex =
    settings?.biologicalSex === 'female'
      ? 'female'
      : settings?.biologicalSex === 'male'
        ? 'male'
        : 'other';

  const fitnessAge = useMemo(() => {
    if (vo2Median == null) return null;
    return fitnessAgeFromVo2(vo2Median, fitnessSex);
  }, [vo2Median, fitnessSex]);

  const latestLab = labPanels[0];
  const dailyParsed = parseDailyInputs(dailyRow);

  const saveLabPanel = async () => {
    if (!settings) return;
    const ageAtTest = ageFromBirthYear(settings.birthYear, parseLocalDateSafe(labDate));
    if (ageAtTest == null) {
      setToast('Set birth year in Settings for PhenoAge');
      return;
    }
    const albumin_gL =
      labUnits === 'us' ? albumin_gDlTo_gL(Number(labForm.albumin)) : Number(labForm.albumin);
    const creatinine_umolL =
      labUnits === 'us'
        ? creatinine_mgDlTo_umolL(Number(labForm.creatinine))
        : Number(labForm.creatinine);
    const glucose_mmolL =
      labUnits === 'us'
        ? glucose_mgDlTo_mmolL(Number(labForm.glucose))
        : Number(labForm.glucose);
    const crp_mgDl =
      labUnits === 'us' ? crp_mgLTo_mgDl(Number(labForm.crp)) : Number(labForm.crp);
    const pheno = phenoAgeFromLabs({
      albumin_gL,
      creatinine_umolL,
      glucose_mmolL,
      crp_mgDl,
      lymphocytePct: Number(labForm.lymphocytePct),
      mcv: Number(labForm.mcv),
      rdw: Number(labForm.rdw),
      alp: Number(labForm.alp),
      wbc: Number(labForm.wbc),
      chronologicalAge: ageAtTest,
    });
    const saved = await repo.upsertLabPanel({
      date: labDate,
      albumin_gL,
      creatinine_umolL,
      glucose_mmolL,
      crp_mgDl,
      lymphocytePct: Number(labForm.lymphocytePct),
      mcv: Number(labForm.mcv),
      rdw: Number(labForm.rdw),
      alp: Number(labForm.alp),
      wbc: Number(labForm.wbc),
      chronologicalAgeAtTest: ageAtTest,
      phenoAgeYears: pheno,
    });
    setLabPanels(await repo.listLabPanels());
    setPhenoOpen(false);
    setToast(
      pheno != null
        ? `Lab panel saved · PhenoAge ${pheno.toFixed(1)}`
        : `Lab panel saved · PhenoAge could not be computed`,
    );
    void saved;
  };

  const toggleJournalTag = async (key: (typeof JOURNAL_TAG_KEYS)[number]) => {
    const active = new Set(journalRow?.tags ?? []);
    if (active.has(key)) active.delete(key);
    else active.add(key);
    const row = await repo.upsertJournalTags({
      date: today,
      tags: [...active],
    });
    setJournalRow(row);
  };

  if (!settings || !profile) return null;

  return (
    <div className="stack page">
      <header className="panel page-header">
        <p className="briefing-kicker">Health Intelligence</p>
        <h1>Today’s health briefing</h1>
        <p className="muted">
          Local-first. Wearable imports stay honest: no fake “connected” states. Deep metrics live
          on <Link to="/body">Body Intelligence</Link> and <Link to="/physique">Body Map</Link>.
        </p>
      </header>

      <section className="panel stack">
        <div className="section-head">
          <h2>Health Profile</h2>
          <span className="badge badge-accent">
            {profile.composite != null ? `Composite ${profile.composite}/100` : 'Building…'}
          </span>
        </div>
        <p className="muted">
          Completeness {Math.round(profile.completeness * 100)}% · transparent domain scores — not
          a medical assessment.
        </p>
        <div className="bi-grid">
          {profile.domains.map((d) => (
            <div key={d.id} className="bi-metric">
              <div className="label">{d.label}</div>
              <div className="bi-value mono">{d.score != null ? `${d.score}` : '—'}</div>
              <p className="muted bi-hint">{d.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <div className="section-head">
          <h2>Body age</h2>
          <span className="badge badge-info">Two estimates — never averaged</span>
        </div>
        <p className="muted">
          Fitness Age (VO₂max, HUNT) and PhenoAge (Levine 2018 labs) are separate published models.
          Chronological age{chronoAge != null ? `: ${chronoAge}` : ' — set birth year in Settings'}.
        </p>
        <div className="bi-grid">
          <div className="bi-metric">
            <div className="label">Fitness age · VO₂max</div>
            {fitnessAge != null && vo2Median != null ? (
              <>
                <div className="bi-value mono">{Math.round(fitnessAge)}</div>
                <p className="muted bi-hint">
                  Median VO₂ {vo2Median.toFixed(1)} (30d)
                  {chronoAge != null ? ` · you are ${chronoAge}` : ''}
                </p>
              </>
            ) : (
              <p className="muted bi-hint">
                Needs a watch that measures cardio fitness, or a lab test
              </p>
            )}
            <details className="panel-inset" style={{ marginTop: 8 }}>
              <summary className="label">How fitness age is calculated</summary>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {FITNESS_AGE_CITATION}
              </p>
              <p className="muted">What moves it: zone-2 cardio, intervals, consistent training.</p>
            </details>
          </div>
          <div className="bi-metric">
            <div className="label">PhenoAge · blood labs</div>
            {latestLab?.phenoAgeYears != null ? (
              <>
                <div className="bi-value mono">{latestLab.phenoAgeYears.toFixed(1)}</div>
                <p className="muted bi-hint">
                  Test {latestLab.date} · chrono {latestLab.chronologicalAgeAtTest}
                </p>
              </>
            ) : (
              <p className="muted bi-hint">Add a lab panel to track PhenoAge over time.</p>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 8 }}
              onClick={() => setPhenoOpen((o) => !o)}
            >
              {phenoOpen ? 'Hide lab form' : 'Enter lab panel'}
            </button>
            <details className="panel-inset" style={{ marginTop: 8 }}>
              <summary className="label">PhenoAge citation</summary>
              <p className="muted" style={{ margin: '8px 0 0' }}>{PHENOAGE_CITATION}</p>
            </details>
          </div>
        </div>
        {phenoOpen && (
          <div className="panel-inset stack" style={{ gap: 8 }}>
            <label>
              <span className="label">Test date</span>
              <input
                className="input"
                type="date"
                value={labDate}
                onChange={(e) => setLabDate(e.target.value)}
              />
            </label>
            <label>
              <span className="label">Units</span>
              <select
                className="select"
                value={labUnits}
                onChange={(e) => setLabUnits(e.target.value as 'si' | 'us')}
              >
                <option value="si">SI (g/L, µmol/L, mmol/L, mg/dL CRP)</option>
                <option value="us">US (g/dL, mg/dL creatinine, mg/dL glucose, mg/L CRP)</option>
              </select>
            </label>
            {(
              [
                ['albumin', labUnits === 'si' ? 'Albumin (g/L)' : 'Albumin (g/dL)'],
                ['creatinine', labUnits === 'si' ? 'Creatinine (µmol/L)' : 'Creatinine (mg/dL)'],
                ['glucose', labUnits === 'si' ? 'Glucose (mmol/L)' : 'Glucose (mg/dL)'],
                ['crp', labUnits === 'us' ? 'CRP (mg/L)' : 'CRP (mg/dL)'],
                ['lymphocytePct', 'Lymphocyte %'],
                ['mcv', 'MCV'],
                ['rdw', 'RDW %'],
                ['alp', 'Alkaline phosphatase'],
                ['wbc', 'WBC (10³/µL)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span className="label">{label}</span>
                <input
                  className="input"
                  type="number"
                  step="any"
                  value={labForm[key]}
                  onChange={(e) => setLabForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </label>
            ))}
            <button type="button" className="btn btn-primary" onClick={() => void saveLabPanel()}>
              Save lab panel
            </button>
          </div>
        )}
        {labPanels.length > 1 && (
          <p className="muted">
            PhenoAge trend:{' '}
            {labPanels
              .filter((p) => p.phenoAgeYears != null)
              .slice(0, 5)
              .map((p) => `${p.date} ${p.phenoAgeYears!.toFixed(1)}`)
              .join(' → ')}
          </p>
        )}
        <div className="panel-inset">
          <p className="label">{profile.paceOfChange.label}</p>
          <p>
            {profile.paceOfChange.direction} — {profile.paceOfChange.note}
          </p>
        </div>
      </section>

      <section className="panel stack">
        <div className="section-head">
          <h2>Readiness</h2>
          <span className="badge badge-accent">PROJECT 85 score, not medical</span>
        </div>
        <div className="bi-grid">
          <div className="bi-metric">
            <div className="label">Recovery</div>
            {dailyRow?.recovery != null ? (
              <>
                <div className="bi-value mono">{dailyRow.recovery}</div>
                <span className={`badge ${recoveryBadgeClass(dailyRow.recovery)}`}>
                  {recoveryBandFromScore(dailyRow.recovery)}
                </span>
                {dailyParsed.recovery?.status === 'ready' && dailyParsed.recovery.drag && (
                  <p className="muted bi-hint">{dailyParsed.recovery.drag.message}</p>
                )}
              </>
            ) : dailyParsed.recovery?.status === 'calibrating' ? (
              <p className="muted bi-hint">
                Calibrating, day {dailyParsed.recovery.day}/{dailyParsed.recovery.needed}
              </p>
            ) : (
              <p className="muted bi-hint">Sync health data or log sleep to build recovery.</p>
            )}
            {dailyParsed.hrvNote && <p className="muted bi-hint">{dailyParsed.hrvNote}</p>}
          </div>
          <div className="bi-metric">
            <div className="label">Strain (0–21)</div>
            <div className="bi-value mono">{dailyRow?.strain?.toFixed(1) ?? '—'}</div>
          </div>
          <div className="bi-metric">
            <div className="label">Sleep performance</div>
            <div className="bi-value mono">
              {dailyRow?.sleepPerf != null ? `${dailyRow.sleepPerf}%` : '—'}
            </div>
            {dailyParsed.goToBedBy && (
              <p className="muted bi-hint">Go to bed by {dailyParsed.goToBedBy} tonight</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel stack">
        <h2>Journal tags · today</h2>
        <p className="muted">Optional yes/no tags — insights appear after enough data.</p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {JOURNAL_TAG_KEYS.map((key) => {
            const on = journalRow?.tags.includes(key) ?? false;
            return (
              <button
                key={key}
                type="button"
                className={`btn ${on ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => void toggleJournalTag(key)}
              >
                {JOURNAL_LABELS[key]}
              </button>
            );
          })}
        </div>
        {journalInsights.length > 0 && (
          <ul className="history-list">
            {journalInsights.map((line) => (
              <li key={line} className="muted">
                {line}
              </li>
            ))}
          </ul>
        )}
      </section>

      {bodyIntel && (
        <section className="panel stack">
          <div className="section-head">
            <h2>Derived energy (PROJECT 85)</h2>
            <Link to="/body">Details</Link>
          </div>
          <div className="grid-metrics">
            <div className="bi-metric">
              <div className="label">BMR · estimate</div>
              <div className="bi-value mono">
                {bodyIntel.bmrKcal != null ? `${bodyIntel.bmrKcal}` : '—'}
              </div>
            </div>
            <div className="bi-metric">
              <div className="label">TDEE · estimate</div>
              <div className="bi-value mono">
                {bodyIntel.tdeeKcal != null ? `${bodyIntel.tdeeKcal}` : '—'}
              </div>
            </div>
            <div className="bi-metric">
              <div className="label">BMI · screening</div>
              <div className="bi-value mono">{bodyIntel.bmi ?? '—'}</div>
            </div>
          </div>
          <p className="muted">Distinct from any imported active/total energy from devices.</p>
        </section>
      )}

      <section className="panel stack">
        <div className="section-head">
          <h2>Data sources</h2>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={syncBusy}
              onClick={() => void runSync()}
            >
              Sync now
            </button>
            <button
              type="button"
              className="btn"
              disabled={syncBusy}
              onClick={() => void connectApple()}
            >
              Connect Apple Health
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                void repo.refreshHealthConnectionDiagnostics().then(setConnections)
              }
            >
              Re-check
            </button>
          </div>
        </div>
        {syncNote && <p className="muted">{syncNote}</p>}
        <p className="muted">{googleSetup.reason}</p>
        <ul className="history-list">
          {(connections.length ? connections : diagnoseAllConnections()).map((c) => (
            <li key={c.id} className="history-row">
              <div>
                <strong>{c.displayName}</strong>{' '}
                <span className={`badge ${statusBadge(c.status)}`}>{c.status}</span>
                <p className="muted">{c.notes}</p>
                <p className="dim" style={{ fontSize: 'var(--text-caption)' }}>
                  Last success: {c.lastSuccessAt ?? 'never'} · Attempt:{' '}
                  {c.lastAttemptAt ?? '—'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel stack">
        <h2>Metric catalogue</h2>
        <p className="muted">Honest availability — not live device values unless imported.</p>
        <div className="metric-catalogue-cards">
          {METRIC_REGISTRY.map((m) => {
            const local =
              (m.id === 'steps' && agg?.steps != null) ||
              (m.id === 'weight' && (agg?.primaryWeightKg != null || weights.length > 0)) ||
              (m.id === 'sleep_asleep' && (agg?.sleepHours != null || sleepAvg != null)) ||
              (m.id === 'hydration' && (agg?.waterMl ?? 0) > 0) ||
              (m.id === 'nutrition_import' && (agg?.foodEntryCount ?? 0) > 0);
            const avail = metricAvailability(m.id, connections, local);
            return (
              <div key={m.id} className="metric-catalogue-card">
                <div className="row">
                  <strong>{m.label}</strong>
                  <span className="badge badge-info">{avail}</span>
                </div>
                <p className="dim" style={{ margin: 0, fontSize: 'var(--text-caption)' }}>
                  {m.category} · {m.nature}
                </p>
              </div>
            );
          })}
        </div>
        <div className="table-wrap metric-catalogue-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Category</th>
                <th>Nature</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_REGISTRY.map((m) => {
                const local =
                  (m.id === 'steps' && agg?.steps != null) ||
                  (m.id === 'weight' && (agg?.primaryWeightKg != null || weights.length > 0)) ||
                  (m.id === 'sleep_asleep' && (agg?.sleepHours != null || sleepAvg != null)) ||
                  (m.id === 'hydration' && (agg?.waterMl ?? 0) > 0) ||
                  (m.id === 'nutrition_import' && (agg?.foodEntryCount ?? 0) > 0);
                const avail = metricAvailability(m.id, connections, local);
                return (
                  <tr key={m.id}>
                    <td>{m.label}</td>
                    <td>{m.category}</td>
                    <td>{m.nature}</td>
                    <td>
                      <span className="badge badge-info">{avail}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
