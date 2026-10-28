import { useEffect, useState } from 'react';
import { FoodLibraryManager } from '../components/FoodLibraryManager';
import { PwaStatusCard } from '../components/InstallPwa';
import * as repo from '../data/repository';
import type { RestoreMode } from '../data/repository';
import { useAppStore } from '../store/useAppStore';
import type { BiologicalSex, ThemeMode } from '../domain/types';
import { Link } from 'react-router-dom';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const refreshSettings = useAppStore((s) => s.refreshSettings);
  const setToast = useAppStore((s) => s.setToast);
  const [busy, setBusy] = useState(false);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge_keep_newer');
  const [replaceConfirm, setReplaceConfirm] = useState('');

  if (!settings) return null;

  const save = async (patch: Parameters<typeof repo.updateSettings>[0]) => {
    await repo.updateSettings(patch);
    await refreshSettings();
    applyTheme(patch.theme ?? settings.theme);
    setToast('Settings saved');
  };

  const download = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCurrentBackup = async () => {
    setBusy(true);
    try {
      const backup = await repo.createBackup();
      download(
        `project85-backup-${backup.exportedAt.slice(0, 10)}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      );
      setToast('JSON backup downloaded — keep this file safe');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack page">
      <header className="panel page-header">
        <h1>Settings</h1>
        <p className="muted">
          Local-only on this device. Clearing browser storage or uninstalling can erase data —
          export backups regularly. No cloud sync.
        </p>
      </header>

      <section className="panel stack">
        <h2 style={{ fontSize: '1.05rem' }}>Mission</h2>
        <Field
          label="Start date"
          type="date"
          value={settings.startDate}
          onCommit={(v) => void save({ startDate: v })}
        />
        <Field
          label="Deadline"
          type="date"
          value={settings.deadline}
          onCommit={(v) => void save({ deadline: v })}
        />
        <Field
          label="Starting weight (kg)"
          type="number"
          value={String(settings.startingWeightKg)}
          onCommit={(v) => void save({ startingWeightKg: Number(v) })}
        />
        <Field
          label="Target weight (kg)"
          type="number"
          value={String(settings.targetWeightKg)}
          onCommit={(v) => void save({ targetWeightKg: Number(v) })}
        />
      </section>

      <section className="panel stack">
        <h2 style={{ fontSize: '1.05rem' }}>Body profile</h2>
        <p className="muted">
          Needed for BMI/BMR/TDEE. Tape sites live on <Link to="/physique">Body Map</Link>.
        </p>
        <Field
          label="Height (cm)"
          type="number"
          value={settings.heightCm != null ? String(settings.heightCm) : ''}
          onCommit={(v) =>
            void save({ heightCm: v.trim() === '' ? null : Number(v) })
          }
        />
        <Field
          label="Birth year"
          type="number"
          value={settings.birthYear != null ? String(settings.birthYear) : ''}
          onCommit={(v) =>
            void save({ birthYear: v.trim() === '' ? null : Number(v) })
          }
        />
        <label>
          <span className="label">Biological sex (for BMR formula)</span>
          <select
            className="select"
            value={settings.biologicalSex}
            onChange={(e) => void save({ biologicalSex: e.target.value as BiologicalSex })}
          >
            <option value="unspecified">Unspecified (mid estimate)</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <p className="muted">
          Also: <Link to="/body">Body Intelligence</Link> · <Link to="/health">Health</Link> ·{' '}
          <Link to="/motivation">Motivation</Link> · <Link to="/timeline">Timeline</Link>
        </p>
      </section>

      <section className="panel stack">
        <h2 style={{ fontSize: '1.05rem' }}>Daily targets</h2>
        <Field
          label="Calories"
          type="number"
          value={String(settings.calorieTarget)}
          onCommit={(v) => void save({ calorieTarget: Number(v) })}
        />
        <Field
          label="Protein (g)"
          type="number"
          value={String(settings.proteinTargetG)}
          onCommit={(v) => void save({ proteinTargetG: Number(v) })}
        />
        <Field
          label="Fibre (g)"
          type="number"
          value={String(settings.fibreTargetG)}
          onCommit={(v) => void save({ fibreTargetG: Number(v) })}
        />
        <Field
          label="Water (ml)"
          type="number"
          value={String(settings.waterTargetMl)}
          onCommit={(v) => void save({ waterTargetMl: Number(v) })}
        />
        <Field
          label="Steps"
          type="number"
          value={String(settings.stepsTarget)}
          onCommit={(v) => void save({ stepsTarget: Number(v) })}
        />
        <Field
          label="Sleep (hours)"
          type="number"
          value={String(settings.sleepTargetHours)}
          onCommit={(v) => void save({ sleepTargetHours: Number(v) })}
        />
        <Field
          label="Cigarette goal"
          type="number"
          value={String(settings.cigaretteTarget)}
          onCommit={(v) => void save({ cigaretteTarget: Number(v) })}
        />
      </section>

      <section className="panel stack">
        <h2 style={{ fontSize: '1.05rem' }}>Appearance & experience</h2>
        <label>
          <span className="label">Theme</span>
          <select
            className="select"
            value={settings.theme}
            onChange={(e) => void save({ theme: e.target.value as ThemeMode })}
          >
            <option value="dark">Dark (default)</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.focusMode}
            onChange={(e) => void save({ focusMode: e.target.checked })}
          />
          Focus Mode — three priorities + quick actions on Today
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.shoulderCaution}
            onChange={(e) => void save({ shoulderCaution: e.target.checked })}
          />
          Shoulder caution — coaching avoids painful press prescriptions
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.avoidChai}
            onChange={(e) => void save({ avoidChai: e.target.checked })}
          />
          Avoid chai suggestions (GI sensitivity)
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.dayTypeCalories !== false}
            onChange={(e) => void save({ dayTypeCalories: e.target.checked })}
          />
          Day-specific calories — Saturday −50 kcal, rest days −400 kcal (carbs carry it)
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.accountabilityEnabled}
            onChange={(e) => void save({ accountabilityEnabled: e.target.checked })}
          />
          Accountability consequences enabled
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.rewardsEnabled}
            onChange={(e) => void save({ rewardsEnabled: e.target.checked })}
          />
          Rewards / XP enabled
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.remindersEnabled}
            onChange={(e) => void save({ remindersEnabled: e.target.checked })}
          />
          Reminder preference (local only — never mandatory)
        </label>
      </section>

      <FoodLibraryManager />

      <PwaStatusCard />

      <section className="panel stack">
        <h2 style={{ fontSize: '1.05rem' }}>Backup & export</h2>
        <p className="dim" style={{ margin: 0, fontSize: '0.85rem' }}>
          Backups are easy to find here. Restore defaults to <strong>merge</strong> so newer local
          records are not silently overwritten. Full replace requires typing REPLACE.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void downloadCurrentBackup()}
        >
          Download JSON backup
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const backup = await repo.createBackup();
              download(
                `project85-export-${backup.exportedAt.slice(0, 10)}.csv`,
                repo.backupToCsv(backup),
                'text/csv',
              );
              setToast('CSV exported');
            } finally {
              setBusy(false);
            }
          }}
        >
          Export CSV
        </button>

        <fieldset className="stack" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
          <legend className="label">Restore mode</legend>
          <label className="row">
            <input
              type="radio"
              name="restoreMode"
              checked={restoreMode === 'merge_keep_newer'}
              onChange={() => setRestoreMode('merge_keep_newer')}
            />
            Merge — keep newer local records (recommended)
          </label>
          <label className="row">
            <input
              type="radio"
              name="restoreMode"
              checked={restoreMode === 'replace'}
              onChange={() => setRestoreMode('replace')}
            />
            Replace all — wipe local data first
          </label>
          {restoreMode === 'replace' && (
            <label>
              <span className="label">Type REPLACE to confirm wipe</span>
              <input
                className="input"
                value={replaceConfirm}
                onChange={(e) => setReplaceConfirm(e.target.value)}
                placeholder="REPLACE"
                autoComplete="off"
              />
            </label>
          )}
        </fieldset>

        <label className="btn">
          Restore from JSON backup
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={busy || (restoreMode === 'replace' && replaceConfirm !== 'REPLACE')}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (restoreMode === 'replace' && replaceConfirm !== 'REPLACE') {
                setToast('Type REPLACE to confirm a full wipe restore');
                e.target.value = '';
                return;
              }
              if (
                restoreMode === 'replace' &&
                !confirm(
                  'This will delete current local data and load the backup. Download a backup first if unsure.',
                )
              ) {
                e.target.value = '';
                return;
              }
              try {
                setBusy(true);
                const text = await file.text();
                const data = JSON.parse(text) as unknown;
                const result = await repo.restoreBackup(data, { mode: restoreMode });
                await refreshSettings();
                setReplaceConfirm('');
                setToast(
                  restoreMode === 'merge_keep_newer'
                    ? `Merged: kept ${result.keptLocalNewer} newer local · imported ${result.imported}`
                    : 'Backup restored (full replace)',
                );
              } catch (err) {
                setToast(err instanceof Error ? err.message : 'Restore failed');
              } finally {
                setBusy(false);
                e.target.value = '';
              }
            }}
          />
        </label>
        <button
          type="button"
          className="btn btn-danger"
          onClick={async () => {
            if (
              !confirm(
                'Delete ALL local Project 85 data on this device? This cannot be undone.',
              )
            )
              return;
            if (!confirm('Really clear everything? Export a backup first if unsure.')) return;
            await repo.clearAllData();
            await refreshSettings();
            setToast('All data cleared');
          }}
        >
          Clear all data
        </button>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  type,
  onCommit,
}: {
  label: string;
  value: string;
  type: string;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="input"
        type={type}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onCommit(local);
        }}
      />
    </label>
  );
}

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}
