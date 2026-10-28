import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as repo from '../data/repository';
import { diagnoseAllConnections } from '../health/adapters';
import { buildHealthProfile } from '../health/healthProfile';
import { METRIC_REGISTRY } from '../health/metricRegistry';
import type { HealthConnectionState, MetricAvailability } from '../health/types';
import { ageFromBirthYear, buildBodyIntelligence, computeBmi } from '../lib/bodyMetrics';
import { previousISODate, sleepDurationHours, toLocalISODate } from '../lib/dates';
import { assessWeightTrend } from '../lib/weightTrend';
import {
  checkNativeHealthAvailability,
  requestHealthAuthorization,
} from '../native/healthKitBridge';
import { runFullHealthSync } from '../health/syncEngine';
import { getGoogleHealthSetupStatus } from '../health/googleHealthClient';
import { useAppStore } from '../store/useAppStore';

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
  const setToast = useAppStore((s) => s.setToast);
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
    })();
  }, [settings, agg?.steps, agg?.sleepHours, agg?.primaryWeightKg]);

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

  if (!settings || !profile) return null;

  return (
    <div className="stack">
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
        <h2>Biological age</h2>
        <p>
          <strong>Numerical biological age: not implemented.</strong> {profile.biologicalAgeReason}
        </p>
        <div className="panel-inset">
          <p className="label">{profile.paceOfChange.label}</p>
          <p>
            {profile.paceOfChange.direction} — {profile.paceOfChange.note}
          </p>
        </div>
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
        <div className="table-wrap">
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
