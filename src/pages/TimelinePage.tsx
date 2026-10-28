import { useEffect, useMemo, useState } from 'react';
import * as repo from '../data/repository';
import type { ProgressPhoto, PhotoPose } from '../domain/types';
import { toLocalISODate } from '../lib/dates';
import { buildTransformationTimeline, monthlySummary } from '../lib/timeline';
import { useAppStore } from '../store/useAppStore';

export function TimelinePage() {
  const settings = useAppStore((s) => s.settings);
  const setToast = useAppStore((s) => s.setToast);
  const [events, setEvents] = useState<ReturnType<typeof buildTransformationTimeline>>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [pose, setPose] = useState<PhotoPose>('front');
  const [date, setDate] = useState(toLocalISODate());
  const [compareLeft, setCompareLeft] = useState<string | null>(null);
  const [compareRight, setCompareRight] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [weights, measurements, photosRows, journals, milestones, achievements] =
      await Promise.all([
        repo.getAllWeights(),
        repo.getAllBodyMeasurements(),
        repo.listProgressPhotos(),
        repo.listJournalEntries(),
        repo.listMotivationItems(),
        dbAchievements(),
      ]);
    const allWorkouts = await loadWorkoutsSince(settings?.startDate ?? toLocalISODate());
    setPhotos(photosRows);
    setEvents(
      buildTransformationTimeline({
        weights,
        measurements,
        photos: photosRows,
        workouts: allWorkouts,
        achievements,
        journals,
        milestones,
      }),
    );
  };

  useEffect(() => {
    void reload();
  }, [settings?.startDate]);

  const months = useMemo(() => monthlySummary(events), [events]);

  const onPhoto = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToast('Choose an image file');
      return;
    }
    if (file.size > 6_000_000) {
      setToast('Keep photos under ~6 MB for local storage');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      await repo.addProgressPhoto({
        date,
        pose,
        dataUrl,
        mimeType: file.type,
        consentExternalAnalysis: false,
      });
      await reload();
      setToast('Photo saved locally — original preserved; no upload');
    } finally {
      setBusy(false);
    }
  };

  const left = photos.find((p) => p.id === compareLeft);
  const right = photos.find((p) => p.id === compareRight);

  const exportReport = () => {
    const text = [
      'PROJECT 85 — Transformation report (local export)',
      `Exported: ${new Date().toISOString()}`,
      '',
      ...events.map(
        (e) =>
          `${e.date}\t${e.kind}\t${e.title}\t${e.detail}${e.estimated ? '\t[estimated]' : ''}`,
      ),
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project85-timeline-${toLocalISODate()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setToast('Report downloaded — stays private unless you share the file');
  };

  if (!settings) return null;

  return (
    <div className="stack">
      <header className="panel page-header">
        <p className="briefing-kicker">Transformation</p>
        <h1>Timeline</h1>
        <p className="muted">
          Weights, measurements, photos, workouts, journals and milestones — private by default.
          Photos are never altered to simulate transformation.
        </p>
      </header>

      <section className="panel stack">
        <div className="section-head">
          <h2>Progress photos</h2>
          <p className="muted">Front / side / back · consistent pose guidance</p>
        </div>
        <p className="muted">
          Pose tip: same lighting, distance, time of day; relaxed stance; no flexing for
          comparisons. Instructional only.
        </p>
        <div className="grid-2">
          <label>
            <span className="label">Date</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span className="label">Pose</span>
            <select className="select" value={pose} onChange={(e) => setPose(e.target.value as PhotoPose)}>
              <option value="front">Front</option>
              <option value="side">Side</option>
              <option value="back">Back</option>
            </select>
          </label>
        </div>
        <label>
          <span className="label">Add photo (local only)</span>
          <input
            className="input"
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="photo-grid">
          {photos.length === 0 ? (
            <p className="muted">No photos yet.</p>
          ) : (
            photos.slice(0, 24).map((p) => (
              <figure key={p.id} className="photo-card">
                <img src={p.dataUrl} alt={`${p.pose} ${p.date}`} />
                <figcaption>
                  {p.date} · {p.pose}
                  {!p.consentExternalAnalysis && (
                    <span className="muted"> · no external AI consent</span>
                  )}
                </figcaption>
                <div className="row" style={{ gap: 6 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setCompareLeft(p.id)}>
                    Compare L
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setCompareRight(p.id)}>
                    Compare R
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      void repo.deleteProgressPhoto(p.id).then(reload)
                    }
                  >
                    Delete
                  </button>
                </div>
              </figure>
            ))
          )}
        </div>
      </section>

      {(left || right) && (
        <section className="panel stack">
          <h2>Side-by-side</h2>
          <div className="compare-photos">
            <div>{left ? <img src={left.dataUrl} alt="left" /> : <p className="muted">Select L</p>}</div>
            <div>{right ? <img src={right.dataUrl} alt="right" /> : <p className="muted">Select R</p>}</div>
          </div>
          <p className="muted">Originals unchanged — overlay slider deferred; side-by-side only.</p>
        </section>
      )}

      <section className="panel stack">
        <div className="section-head">
          <h2>Monthly summaries</h2>
          <button type="button" className="btn" onClick={exportReport}>
            Export report
          </button>
        </div>
        {months.length === 0 ? (
          <p className="muted">No timeline events yet.</p>
        ) : (
          <ul className="plain-list">
            {months.map((m) => (
              <li key={m.month}>
                <strong>{m.month}</strong> — weights {m.weightEvents}, measurements{' '}
                {m.measureEvents}, photos {m.photoEvents}, workouts {m.workoutEvents}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel stack">
        <h2>Unified timeline</h2>
        <ul className="history-list">
          {events.slice(0, 80).map((e) => (
            <li key={e.id} className="history-row">
              <div>
                <span className="badge badge-info">{e.kind}</span>{' '}
                <strong>{e.date}</strong> · {e.title}
                <div className="muted">
                  {e.detail}
                  {e.estimated ? ' · estimated value' : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

async function dbAchievements() {
  const { db } = await import('../data/db');
  return db.achievements.toArray();
}

async function loadWorkoutsSince(start: string) {
  const { db } = await import('../data/db');
  return db.workouts.where('date').aboveOrEqual(start).toArray();
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
