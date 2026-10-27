import { useState } from 'react';
import { PwaStatusCard } from '../components/InstallPwa';
import * as repo from '../data/repository';
import { useAppStore } from '../store/useAppStore';
import type { ThemeMode } from '../domain/types';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const refreshSettings = useAppStore((s) => s.refreshSettings);
  const setToast = useAppStore((s) => s.setToast);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="stack">
      <header className="panel">
        <h1 style={{ fontSize: '1.4rem' }}>Settings</h1>
        <p className="muted" style={{ margin: 0 }}>
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
        <h2 style={{ fontSize: '1.05rem' }}>Appearance & accountability</h2>
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
          Reminder preference (local only — enable browser notifications separately)
        </label>
      </section>

      <PwaStatusCard />

      <section className="panel stack">
        <h2 style={{ fontSize: '1.05rem' }}>Backup & export</h2>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const backup = await repo.createBackup();
              download(
                `project85-backup-${backup.exportedAt.slice(0, 10)}.json`,
                JSON.stringify(backup, null, 2),
                'application/json',
              );
              setToast('JSON backup downloaded');
            } finally {
              setBusy(false);
            }
          }}
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
        <label className="btn">
          Restore from JSON backup
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const data = JSON.parse(text) as unknown;
                await repo.restoreBackup(data);
                await refreshSettings();
                setToast('Backup restored');
              } catch (err) {
                setToast(err instanceof Error ? err.message : 'Restore failed');
              }
              e.target.value = '';
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
