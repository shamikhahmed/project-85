import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BodySilhouette } from '../components/BodySilhouette';
import * as repo from '../data/repository';
import type {
  BodyMeasurement,
  BodyMeasurementType,
  BodyView,
  LengthUnit,
  MeasurementCondition,
} from '../domain/types';
import {
  compareMeasurementDates,
  distinctMeasurementDates,
  historyForType,
  latestByTypeOnOrBefore,
} from '../lib/measurementCompare';
import {
  CONDITION_LABELS,
  MEASUREMENT_CATALOGUE,
  defFor,
  defsForRegion,
  systemsWithDefs,
} from '../lib/measurementCatalogue';
import {
  formatLength,
  parseLengthInput,
  roundLength,
  validateMeasurementCm,
} from '../lib/measurementUnits';
import { toLocalISODate } from '../lib/dates';
import { useAppStore } from '../store/useAppStore';

type PhysiqueTab = 'overview' | 'log' | 'guide' | 'data';

const CHART_COLORS = ['#c4f36b', '#7ec8ff', '#f5c542', '#ff6b7a', '#3dd68c', '#d4ff8a'];

const MULTI_SITE_PRESETS: { id: string; label: string; types: BodyMeasurementType[] }[] = [
  {
    id: 'torso',
    label: 'Torso (chest · waists · hips)',
    types: ['chest', 'waist_natural', 'waist_navel', 'abdomen', 'hips'],
  },
  {
    id: 'arms',
    label: 'Arms (L/R relaxed · flexed)',
    types: [
      'bicep_left_relaxed',
      'bicep_right_relaxed',
      'bicep_left_flexed',
      'bicep_right_flexed',
    ],
  },
  {
    id: 'legs',
    label: 'Legs (L/R thigh · calf)',
    types: ['thigh_left', 'thigh_right', 'calf_left', 'calf_right'],
  },
];

export function BodyMapPage() {
  const settings = useAppStore((s) => s.settings);
  const refreshSettings = useAppStore((s) => s.refreshSettings);
  const setToast = useAppStore((s) => s.setToast);

  const [rows, setRows] = useState<BodyMeasurement[]>([]);
  const [tab, setTab] = useState<PhysiqueTab>('overview');
  const [showOptional, setShowOptional] = useState(false);
  const [unit, setUnit] = useState<LengthUnit>(settings?.lengthUnit ?? 'cm');

  // Session log — one field per measurement type (never shared)
  const [sessionDate, setSessionDate] = useState(toLocalISODate());
  const [sessionCondition, setSessionCondition] =
    useState<MeasurementCondition>('morning_fasted');
  const [sessionValues, setSessionValues] = useState<Partial<Record<BodyMeasurementType, string>>>(
    {},
  );
  const [sessionNotes, setSessionNotes] = useState<Partial<Record<BodyMeasurementType, string>>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [focusType, setFocusType] = useState<BodyMeasurementType | null>(null);

  // Guide
  const [view, setView] = useState<BodyView>('front');
  const [region, setRegion] = useState<string | null>('waist');

  // Compare
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [chartType, setChartType] = useState<BodyMeasurementType>('waist_natural');
  const [multiPreset, setMultiPreset] = useState(MULTI_SITE_PRESETS[0].id);
  const [tableFilter, setTableFilter] = useState('');

  const reload = async () => setRows(await repo.getAllBodyMeasurements());

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (settings?.lengthUnit) setUnit(settings.lengthUnit);
  }, [settings?.lengthUnit]);

  const systems = useMemo(() => systemsWithDefs(showOptional), [showOptional]);

  const latestMap = useMemo(
    () => latestByTypeOnOrBefore(rows, toLocalISODate()),
    [rows],
  );

  const dates = useMemo(() => distinctMeasurementDates(rows), [rows]);

  useEffect(() => {
    if (dates.length >= 2) {
      if (!compareA) setCompareA(dates[0]);
      if (!compareB) setCompareB(dates[dates.length - 1]);
    }
  }, [dates, compareA, compareB]);

  const comparison = useMemo(() => {
    if (!compareA || !compareB) return [];
    return compareMeasurementDates(rows, compareA, compareB);
  }, [rows, compareA, compareB]);

  const displayVal = (cm: number, type?: BodyMeasurementType) =>
    unit === 'cm' ? roundLength(cm, 'cm', type) : roundLength(cm, 'in', type);

  const chartData = useMemo(
    () =>
      historyForType(rows, chartType).map((h) => ({
        date: h.date,
        value: displayVal(h.valueCm, chartType),
      })),
    [rows, chartType, unit],
  );

  const masterTable = useMemo(() => {
    const today = toLocalISODate();
    const prevDate = dates.length >= 2 ? dates[dates.length - 2] : null;
    const latest = latestByTypeOnOrBefore(rows, today);
    const prev = prevDate ? latestByTypeOnOrBefore(rows, prevDate) : new Map();
    return systems.flatMap((sys) =>
      sys.defs.map((d) => {
        const cur = latest.get(d.type);
        const older = prev.get(d.type);
        const delta =
          cur && older ? Math.round((cur.valueCm - older.valueCm) * 10) / 10 : null;
        return {
          system: sys.title,
          type: d.type,
          label: d.label,
          latestCm: cur?.valueCm ?? null,
          latestDate: cur?.date ?? null,
          prevCm: older?.valueCm ?? null,
          deltaCm: delta,
        };
      }),
    );
  }, [rows, dates, systems]);

  const filteredMaster = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return masterTable;
    return masterTable.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.system.toLowerCase().includes(q) ||
        r.type.includes(q),
    );
  }, [masterTable, tableFilter]);

  const deltaBarData = useMemo(() => {
    return comparison
      .filter((c) => c.absCm != null && c.earlier && c.later)
      .map((c) => ({
        name: defFor(c.type)?.shortLabel ?? c.type,
        full: defFor(c.type)?.label ?? c.type,
        delta: c.absCm!,
        fill: (c.absCm ?? 0) <= 0 ? '#c4f36b' : '#ff6b7a',
      }));
  }, [comparison]);

  const multiLineData = useMemo(() => {
    const preset = MULTI_SITE_PRESETS.find((p) => p.id === multiPreset) ?? MULTI_SITE_PRESETS[0];
    const types = preset.types.filter((t) => showOptional || !defFor(t)?.optional);
    const byDate = new Map<string, Record<string, number | string>>();
    for (const t of types) {
      for (const h of historyForType(rows, t)) {
        const row = byDate.get(h.date) ?? { date: h.date };
        row[t] = displayVal(h.valueCm, t);
        byDate.set(h.date, row);
      }
    }
    return {
      types,
      data: [...byDate.values()].sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      ),
    };
  }, [rows, multiPreset, showOptional, unit]);

  const leftRightBars = useMemo(() => {
    const pairs: { label: string; left?: BodyMeasurementType; right?: BodyMeasurementType }[] = [
      { label: 'Bicep relax', left: 'bicep_left_relaxed', right: 'bicep_right_relaxed' },
      { label: 'Bicep flex', left: 'bicep_left_flexed', right: 'bicep_right_flexed' },
      { label: 'Forearm', left: 'forearm_left', right: 'forearm_right' },
      { label: 'Wrist', left: 'wrist_left', right: 'wrist_right' },
      { label: 'Thigh', left: 'thigh_left', right: 'thigh_right' },
      { label: 'Calf', left: 'calf_left', right: 'calf_right' },
    ];
    return pairs
      .map((p) => {
        const L = p.left ? latestMap.get(p.left) : undefined;
        const R = p.right ? latestMap.get(p.right) : undefined;
        if (!L && !R) return null;
        return {
          name: p.label,
          left: L ? displayVal(L.valueCm, p.left) : null,
          right: R ? displayVal(R.valueCm, p.right) : null,
        };
      })
      .filter(Boolean) as { name: string; left: number | null; right: number | null }[];
  }, [latestMap, unit]);

  const snapshotBars = useMemo(() => {
    return masterTable
      .filter((r) => r.latestCm != null && r.type !== 'height')
      .map((r) => ({
        name: defFor(r.type)?.shortLabel ?? r.label,
        value: displayVal(r.latestCm!, r.type),
        full: r.label,
      }));
  }, [masterTable, unit]);

  const exportCsv = () => {
    const lines = ['date,type,label,value_cm,condition,note'];
    for (const r of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
      const note = (r.note ?? '').replace(/"/g, '""');
      lines.push(
        `${r.date},${r.type},"${defFor(r.type)?.label ?? r.type}",${r.valueCm},${r.condition},"${note}"`,
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project85-measurements-${toLocalISODate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast('CSV exported');
  };

  const filledRegions = useMemo(() => {
    return new Set(
      rows.map((r) => defFor(r.type)?.region).filter(Boolean) as string[],
    );
  }, [rows]);

  const trackedCount = latestMap.size;
  const catalogueCount = systems.reduce((n, s) => n + s.defs.length, 0);

  const setSessionValue = (type: BodyMeasurementType, v: string) => {
    setSessionValues((prev) => ({ ...prev, [type]: v }));
  };

  const saveOne = async (type: BodyMeasurementType) => {
    const raw = sessionValues[type]?.trim() ?? '';
    const cm = parseLengthInput(raw, unit);
    if (cm == null) {
      setToast('Enter a valid number');
      return;
    }
    const v = validateMeasurementCm(type, cm);
    if (!v.ok) {
      setToast(v.error);
      return;
    }
    setBusy(true);
    try {
      await repo.addBodyMeasurement({
        type,
        valueCm: cm,
        date: sessionDate,
        note: sessionNotes[type]?.trim() || undefined,
        condition: sessionCondition,
      });
      await refreshSettings();
      await reload();
      setSessionValues((prev) => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
      setToast(`${defFor(type)?.label ?? type} saved`);
    } finally {
      setBusy(false);
    }
  };

  const saveFilledSession = async () => {
    const entries = (Object.entries(sessionValues) as [BodyMeasurementType, string][]).filter(
      ([, v]) => v.trim() !== '',
    );
    if (entries.length === 0) {
      setToast('Fill at least one measurement');
      return;
    }
    setBusy(true);
    let ok = 0;
    try {
      for (const [type, raw] of entries) {
        const cm = parseLengthInput(raw, unit);
        if (cm == null) continue;
        const v = validateMeasurementCm(type, cm);
        if (!v.ok) {
          setToast(v.error);
          continue;
        }
        await repo.addBodyMeasurement({
          type,
          valueCm: cm,
          date: sessionDate,
          note: sessionNotes[type]?.trim() || undefined,
          condition: sessionCondition,
        });
        ok += 1;
      }
      await refreshSettings();
      await reload();
      setSessionValues({});
      setSessionNotes({});
      setToast(
        ok > 0
          ? `Saved ${ok} separate measurement${ok === 1 ? '' : 's'}`
          : 'Nothing saved — check values',
      );
      if (ok > 0) setTab('overview');
    } finally {
      setBusy(false);
    }
  };

  const toggleUnit = async () => {
    const next: LengthUnit = unit === 'cm' ? 'in' : 'cm';
    setUnit(next);
    await repo.updateSettings({ lengthUnit: next });
    await refreshSettings();
  };

  const openLogFor = (type: BodyMeasurementType) => {
    setFocusType(type);
    setTab('log');
  };

  useEffect(() => {
    if (tab !== 'log' || !focusType) return;
    const el = document.getElementById(`log-${focusType}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById(`input-${focusType}`)?.focus();
  }, [tab, focusType]);

  if (!settings) return null;

  const guideDefs = region ? defsForRegion(region) : MEASUREMENT_CATALOGUE;

  return (
    <div className="stack physique">
      <header className="panel page-header">
        <p className="briefing-kicker">My Physique</p>
        <h1>Measurements</h1>
        <p className="muted">
          Every site is its own record — left ≠ right, relaxed ≠ flexed. History is append-only.
          Calculations: <Link to="/body">Body Intelligence</Link>.
        </p>
        <div className="physique-stats" aria-label="Coverage">
          <div>
            <span className="label">Tracked</span>
            <strong className="mono">
              {trackedCount}/{catalogueCount}
            </strong>
          </div>
          <div>
            <span className="label">Sessions</span>
            <strong className="mono">{dates.length}</strong>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => void toggleUnit()}>
            Unit · {unit}
          </button>
        </div>
      </header>

      <nav className="physique-tabs" aria-label="Physique sections">
        {(
          [
            ['overview', 'Overview'],
            ['log', 'Log session'],
            ['guide', 'Body guide'],
            ['data', 'Charts'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <label className="row physique-optional">
        <input
          type="checkbox"
          checked={showOptional}
          onChange={(e) => setShowOptional(e.target.checked)}
        />
        Include optional sites (upper chest, ankles)
      </label>

      {tab === 'overview' && (
        <div className="stack">
          {trackedCount === 0 && (
            <section className="panel empty-physique">
              <h2>No tape readings yet</h2>
              <p className="muted">
                Start a measurement session — each circumference is saved as its own line of
                history.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => setTab('log')}>
                Start session
              </button>
            </section>
          )}

          {systems.map((sys) => (
            <section key={sys.id} className="panel stack physique-system">
              <div className="section-head">
                <div>
                  <h2>{sys.title}</h2>
                  <p className="muted">{sys.subtitle}</p>
                </div>
              </div>
              <ul className="measure-list">
                {sys.defs.map((d) => {
                  const latest = latestMap.get(d.type);
                  return (
                    <li key={d.type} className="measure-row">
                      <div className="measure-meta">
                        <strong>{d.label}</strong>
                        {d.optional && <span className="badge badge-info">Optional</span>}
                        <p className="muted measure-hint">{d.howToMeasure}</p>
                        {latest ? (
                          <p className="dim" style={{ fontSize: 'var(--text-caption)' }}>
                            Last {latest.date}
                          </p>
                        ) : (
                          <p className="dim" style={{ fontSize: 'var(--text-caption)' }}>
                            Not recorded
                          </p>
                        )}
                      </div>
                      <div className="measure-value-col">
                        <span className="measure-value mono">
                          {latest ? formatLength(latest.valueCm, unit, d.type) : '—'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => openLogFor(d.type)}
                        >
                          Log
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {tab === 'log' && (
        <div className="stack">
          <section className="panel stack">
            <h2>Session setup</h2>
            <p className="muted">
              One date and condition for this sitting. Each site below still saves as a separate
              database row.
            </p>
            <div className="grid-2">
              <label>
                <span className="label">Date</span>
                <input
                  className="input"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </label>
              <label>
                <span className="label">Conditions</span>
                <select
                  className="select"
                  value={sessionCondition}
                  onChange={(e) =>
                    setSessionCondition(e.target.value as MeasurementCondition)
                  }
                >
                  {(Object.keys(CONDITION_LABELS) as MeasurementCondition[]).map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void saveFilledSession()}
              >
                Save all filled sites
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSessionValues({});
                  setSessionNotes({});
                }}
              >
                Clear inputs
              </button>
            </div>
          </section>

          {systems.map((sys) => (
            <section key={sys.id} className="panel stack physique-system">
              <div className="section-head">
                <div>
                  <h2>{sys.title}</h2>
                  <p className="muted">{sys.subtitle}</p>
                </div>
              </div>
              <div className="session-fields">
                {sys.defs.map((d) => {
                  const latest = latestMap.get(d.type);
                  const focused = focusType === d.type;
                  return (
                    <div
                      key={d.type}
                      className={`session-field${focused ? ' focused' : ''}`}
                      id={`log-${d.type}`}
                    >
                      <div className="session-field-head">
                        <label htmlFor={`input-${d.type}`}>
                          <span className="label">{d.label}</span>
                        </label>
                        <span className="muted mono" style={{ fontSize: 'var(--text-caption)' }}>
                          {latest
                            ? `was ${formatLength(latest.valueCm, unit, d.type)}`
                            : 'new'}
                        </span>
                      </div>
                      <p className="muted measure-hint">{d.howToMeasure}</p>
                      <div className="session-field-inputs">
                        <input
                          id={`input-${d.type}`}
                          className="input"
                          inputMode="decimal"
                          placeholder={unit === 'cm' ? 'cm' : 'in'}
                          value={sessionValues[d.type] ?? ''}
                          onChange={(e) => setSessionValue(d.type, e.target.value)}
                          onFocus={() => setFocusType(d.type)}
                        />
                        <button
                          type="button"
                          className="btn"
                          disabled={busy || !(sessionValues[d.type] ?? '').trim()}
                          onClick={() => void saveOne(d.type)}
                        >
                          Save
                        </button>
                      </div>
                      <input
                        className="input"
                        placeholder="Note (optional)"
                        value={sessionNotes[d.type] ?? ''}
                        onChange={(e) =>
                          setSessionNotes((prev) => ({ ...prev, [d.type]: e.target.value }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'guide' && (
        <section className="panel body-map-layout">
          <div className="body-map-figure">
            <div className="seg-control" role="tablist" aria-label="Body view">
              {(['front', 'side', 'back'] as BodyView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  className={view === v ? 'active' : ''}
                  onClick={() => setView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <BodySilhouette
              view={view}
              selectedRegion={region}
              onSelectRegion={setRegion}
              filledRegions={filledRegions}
            />
          </div>
          <div className="stack">
            <h2>{region?.replace('_', ' ') ?? 'Region'}</h2>
            <p className="muted">
              Tap a region to see which separate sites belong there. Log them from the session
              tab — the guide never averages left/right.
            </p>
            <ul className="measure-list">
              {guideDefs
                .filter((d) => showOptional || !d.optional)
                .map((d) => (
                  <li key={d.type} className="measure-row">
                    <div className="measure-meta">
                      <strong>{d.label}</strong>
                      <p className="muted measure-hint">{d.howToMeasure}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openLogFor(d.type)}
                    >
                      Log this
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      )}

      {tab === 'data' && (
        <div className="stack">
          <section className="panel stack">
            <div className="section-head">
              <div>
                <h2>Master table</h2>
                <p className="muted">Every site separate · values in {unit}</p>
              </div>
              <button type="button" className="btn" onClick={exportCsv} disabled={rows.length === 0}>
                Export CSV
              </button>
            </div>
            <label>
              <span className="label">Filter sites</span>
              <input
                className="input"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                placeholder="e.g. waist, left, calf"
              />
            </label>
            {filteredMaster.length === 0 ? (
              <p className="muted">No rows — log a session first.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>System</th>
                      <th>Site</th>
                      <th>Latest</th>
                      <th>Date</th>
                      <th>Prior</th>
                      <th>Δ cm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaster.map((r) => (
                      <tr key={r.type}>
                        <td>{r.system}</td>
                        <td>{r.label}</td>
                        <td className="mono">
                          {r.latestCm != null
                            ? formatLength(r.latestCm, unit, r.type)
                            : '—'}
                        </td>
                        <td className="mono">{r.latestDate ?? '—'}</td>
                        <td className="mono">
                          {r.prevCm != null ? formatLength(r.prevCm, unit, r.type) : '—'}
                        </td>
                        <td className="mono">
                          {r.deltaCm == null
                            ? '—'
                            : `${r.deltaCm > 0 ? '+' : ''}${r.deltaCm}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel stack">
            <h2>Latest snapshot · bar chart</h2>
            <p className="muted">All logged sites (height excluded) · {unit}</p>
            {snapshotBars.length === 0 ? (
              <p className="muted">Nothing to graph yet.</p>
            ) : (
              <div className="chart-frame chart-frame-tall">
                <ResponsiveContainer>
                  <BarChart data={snapshotBars} margin={{ left: 4, right: 8, top: 8, bottom: 48 }}>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                      tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
                      width={36}
                      unit={unit === 'cm' ? '' : ''}
                    />
                    <Tooltip
                      formatter={(v) => [`${v} ${unit}`, '']}
                      labelFormatter={(_, payload) =>
                        String(payload?.[0]?.payload?.full ?? '')
                      }
                      contentStyle={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} name={unit} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="panel stack">
            <div className="section-head">
              <div>
                <h2>Multi-site trend · line graph</h2>
                <p className="muted">Separate series — never averaged across sides</p>
              </div>
              <select
                className="select"
                style={{ maxWidth: 260 }}
                value={multiPreset}
                onChange={(e) => setMultiPreset(e.target.value)}
              >
                {MULTI_SITE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {multiLineData.data.length < 2 ? (
              <p className="muted">Need readings across at least two dates for these sites.</p>
            ) : (
              <div className="chart-frame">
                <ResponsiveContainer>
                  <LineChart data={multiLineData.data}>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} width={40} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {multiLineData.types.map((t, i) => (
                      <Line
                        key={t}
                        type="monotone"
                        dataKey={t}
                        name={defFor(t)?.shortLabel ?? t}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="panel stack">
            <h2>Left vs right · bar graph</h2>
            <p className="muted">Paired sites kept separate · {unit}</p>
            {leftRightBars.length === 0 ? (
              <p className="muted">Log left and/or right limb sites to compare.</p>
            ) : (
              <div className="chart-frame">
                <ResponsiveContainer>
                  <BarChart data={leftRightBars}>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} width={36} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="left" name="Left" fill="#c4f36b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="right" name="Right" fill="#7ec8ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="panel stack">
            <h2>Date compare · table + change chart</h2>
            {dates.length < 2 ? (
              <p className="muted">Need measurements on at least two dates.</p>
            ) : (
              <>
                <div className="grid-2">
                  <label>
                    <span className="label">Earlier</span>
                    <select
                      className="select"
                      value={compareA}
                      onChange={(e) => setCompareA(e.target.value)}
                    >
                      {dates.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="label">Later</span>
                    <select
                      className="select"
                      value={compareB}
                      onChange={(e) => setCompareB(e.target.value)}
                    >
                      {dates.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Site</th>
                        <th>Earlier</th>
                        <th>Later</th>
                        <th>Δ</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((c) => (
                        <tr key={c.type}>
                          <td>{defFor(c.type)?.label ?? c.type}</td>
                          <td className="mono">
                            {c.earlier
                              ? formatLength(c.earlier.valueCm, unit, c.type)
                              : '—'}
                          </td>
                          <td className="mono">
                            {c.later ? formatLength(c.later.valueCm, unit, c.type) : '—'}
                          </td>
                          <td className="mono">
                            {c.absCm == null
                              ? '—'
                              : `${c.absCm > 0 ? '+' : ''}${c.absCm} cm`}
                          </td>
                          <td className="mono">
                            {c.pct == null ? '—' : `${c.pct > 0 ? '+' : ''}${c.pct}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {deltaBarData.length > 0 && (
                  <div className="chart-frame">
                    <ResponsiveContainer>
                      <BarChart data={deltaBarData} margin={{ bottom: 40 }}>
                        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={50}
                          tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                        />
                        <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} width={36} />
                        <Tooltip
                          formatter={(v) => [`${v} cm`, 'Change']}
                          labelFormatter={(_, p) => String(p?.[0]?.payload?.full ?? '')}
                          contentStyle={{
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                          }}
                        />
                        <Bar dataKey="delta" name="Δ cm" radius={[4, 4, 0, 0]}>
                          {deltaBarData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="panel stack">
            <div className="section-head">
              <h2>Single-site line chart</h2>
              <select
                className="select"
                style={{ maxWidth: 240 }}
                value={chartType}
                onChange={(e) => setChartType(e.target.value as BodyMeasurementType)}
              >
                {MEASUREMENT_CATALOGUE.map((d) => (
                  <option key={d.type} value={d.type}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            {chartData.length < 2 ? (
              <p className="muted">Need 2+ readings on this exact site.</p>
            ) : (
              <div className="chart-frame">
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
                      width={40}
                    />
                    <Tooltip
                      formatter={(v) => [`${v} ${unit}`, defFor(chartType)?.label ?? '']}
                      contentStyle={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name={unit}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="panel stack">
            <h2>Full history table</h2>
            {rows.length === 0 ? (
              <p className="muted">Nothing logged yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Site</th>
                      <th>Value</th>
                      <th>Condition</th>
                      <th>Note</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows]
                      .sort(
                        (a, b) =>
                          b.date.localeCompare(a.date) ||
                          b.measuredAt.localeCompare(a.measuredAt),
                      )
                      .map((r) => (
                        <tr key={r.id}>
                          <td className="mono">{r.date}</td>
                          <td>{defFor(r.type)?.label ?? r.type}</td>
                          <td className="mono">{formatLength(r.valueCm, unit, r.type)}</td>
                          <td>{CONDITION_LABELS[r.condition]}</td>
                          <td className="muted">{r.note ?? '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() =>
                                void repo.deleteBodyMeasurement(r.id).then(async () => {
                                  await reload();
                                  setToast('Deleted one entry — other history kept');
                                })
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
