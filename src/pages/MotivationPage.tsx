import { useEffect, useMemo, useRef, useState } from 'react';
import * as repo from '../data/repository';
import type {
  JournalEntry,
  MotivationItem,
  MotivationKind,
  MotivationalTone,
  PersonalLetter,
} from '../domain/types';
import { toLocalISODate } from '../lib/dates';
import { useAppStore } from '../store/useAppStore';

const SUGGESTED_PROMPTS = [
  'What does reaching 85 kg make possible in your daily life?',
  'Who are you becoming through this process?',
  'What would a kind coach say after a hard day?',
];

const KIND_LABELS: Record<MotivationKind, string> = {
  reason: 'Reason for starting',
  aspiration: 'Aspiration',
  value: 'Value',
  reminder: 'Reminder',
  milestone: 'Milestone',
  suggested: 'Suggested (not yours)',
};

export function MotivationPage() {
  const settings = useAppStore((s) => s.settings);
  const refreshSettings = useAppStore((s) => s.refreshSettings);
  const setToast = useAppStore((s) => s.setToast);
  const [items, setItems] = useState<MotivationItem[]>([]);
  const [letters, setLetters] = useState<PersonalLetter[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [kind, setKind] = useState<MotivationKind>('reason');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showOnDash, setShowOnDash] = useState(true);
  const [letterTitle, setLetterTitle] = useState('Letter to future me');
  const [letterBody, setLetterBody] = useState('');
  const [openOn, setOpenOn] = useState('2027-01-15');
  const [journalBody, setJournalBody] = useState('');
  const [prompt, setPrompt] = useState(SUGGESTED_PROMPTS[0]);
  const [busy, setBusy] = useState(false);
  // SpeechRecognition is vendor-prefixed in browsers; keep loosely typed.
  const recognitionRef = useRef<{ start: () => void; stop?: () => void } | null>(null);

  const today = toLocalISODate();

  const reload = async () => {
    const [m, l, j] = await Promise.all([
      repo.listMotivationItems(),
      repo.listPersonalLetters(),
      repo.listJournalEntries(),
    ]);
    setItems(m);
    setLetters(l);
    setJournals(j);
  };

  useEffect(() => {
    void reload();
  }, []);

  const visibleItems = useMemo(() => items.filter((i) => !i.hidden), [items]);

  const saveItem = async () => {
    if (!title.trim() || !body.trim()) {
      setToast('Add a title and your own words');
      return;
    }
    setBusy(true);
    try {
      await repo.upsertMotivationItem({
        kind,
        source: 'user',
        title: title.trim(),
        body: body.trim(),
        showOnDashboard: showOnDash,
        pinned: kind === 'reminder',
      });
      setTitle('');
      setBody('');
      await reload();
      setToast('Saved privately on this device');
    } finally {
      setBusy(false);
    }
  };

  const addSuggested = async (text: string) => {
    await repo.upsertMotivationItem({
      kind: 'suggested',
      source: 'suggested',
      title: 'Reflection prompt',
      body: text,
      showOnDashboard: false,
    });
    await reload();
    setToast('Suggested prompt stored — clearly labelled as not written by you');
  };

  const saveLetter = async () => {
    if (!letterBody.trim()) {
      setToast('Write your letter first');
      return;
    }
    setBusy(true);
    try {
      await repo.upsertPersonalLetter({
        title: letterTitle.trim() || 'Letter to future me',
        body: letterBody.trim(),
        openOn,
      });
      setLetterBody('');
      await reload();
      setToast('Letter sealed until open date');
    } finally {
      setBusy(false);
    }
  };

  const saveJournal = async (fromVoice = false) => {
    if (!journalBody.trim()) {
      setToast('Journal is empty');
      return;
    }
    setBusy(true);
    try {
      await repo.upsertJournalEntry({
        date: today,
        body: journalBody.trim(),
        prompt,
        fromVoice,
      });
      setJournalBody('');
      await reload();
      setToast('Journal entry saved locally');
    } finally {
      setBusy(false);
    }
  };

  const startVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
        onerror: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
        onerror: (() => void) | null;
        start: () => void;
      };
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setToast('Voice-to-text not supported in this browser');
      return;
    }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript ?? '';
      setJournalBody((prev) => (prev ? `${prev} ${text}` : text));
    };
    rec.onerror = () => setToast('Voice capture stopped');
    rec.start();
    setToast('Listening… speak your journal note');
  };

  const exportMotivation = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      items: items.filter((i) => i.source === 'user'),
      letters,
      journals,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project85-motivation-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast('Exported — keep this file private');
  };

  if (!settings) return null;

  return (
    <div className="stack page">
      <header className="panel page-header">
        <p className="briefing-kicker">Private · local only</p>
        <h1>Motivation Centre</h1>
        <p className="muted">
          Your reasons, letters and journals stay on this device. Suggested prompts are labelled —
          the app never invents your motivations or claims you wrote them.
        </p>
      </header>

      <section className="panel stack">
        <h2>Tone & dashboard</h2>
        <label>
          <span className="label">Preferred tone</span>
          <select
            className="select"
            value={settings.motivationalTone}
            onChange={(e) =>
              void repo
                .updateSettings({ motivationalTone: e.target.value as MotivationalTone })
                .then(refreshSettings)
            }
          >
            <option value="calm">Calm</option>
            <option value="firm">Firm-supportive</option>
            <option value="celebratory">Celebratory</option>
          </select>
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.showDailyEncouragement}
            onChange={(e) =>
              void repo
                .updateSettings({ showDailyEncouragement: e.target.checked })
                .then(refreshSettings)
            }
          />
          Show one pinned reminder on Today (when you enable “show on dashboard”)
        </label>
        <button type="button" className="btn" onClick={exportMotivation}>
          Export motivation JSON
        </button>
      </section>

      <section className="panel stack">
        <h2>Write yours</h2>
        <label>
          <span className="label">Type</span>
          <select
            className="select"
            value={kind}
            onChange={(e) => setKind(e.target.value as MotivationKind)}
          >
            {(Object.keys(KIND_LABELS) as MotivationKind[])
              .filter((k) => k !== 'suggested')
              .map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span className="label">Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <span className="label">Your words</span>
          <textarea
            className="input"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={showOnDash}
            onChange={(e) => setShowOnDash(e.target.checked)}
          />
          Eligible for Today encouragement
        </label>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveItem()}>
          Save entry
        </button>
      </section>

      <section className="panel stack">
        <h2>Your entries</h2>
        {visibleItems.length === 0 ? (
          <p className="muted">Nothing saved yet — add a reason or reminder above.</p>
        ) : (
          <ul className="history-list">
            {visibleItems.map((item) => (
              <li key={item.id} className="history-row">
                <div>
                  <span className="badge badge-info">{KIND_LABELS[item.kind]}</span>
                  {item.source === 'suggested' && (
                    <span className="badge badge-warn"> Suggested · not user-written</span>
                  )}
                  <div>
                    <strong>{item.title}</strong>
                  </div>
                  <p className="muted">{item.body}</p>
                </div>
                <div className="stack" style={{ gap: 4 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      void repo
                        .upsertMotivationItem({
                          id: item.id,
                          kind: item.kind,
                          title: item.title,
                          body: item.body,
                          hidden: true,
                          showOnDashboard: item.showOnDashboard,
                        })
                        .then(reload)
                    }
                  >
                    Hide
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      void repo.deleteMotivationItem(item.id).then(async () => {
                        await reload();
                        setToast('Deleted');
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel stack">
        <h2>Suggested prompts</h2>
        <p className="muted">Clearly suggested — never presented as your writing.</p>
        {SUGGESTED_PROMPTS.map((p) => (
          <div key={p} className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
            <span>{p}</span>
            <button type="button" className="btn" onClick={() => void addSuggested(p)}>
              Save as suggested
            </button>
          </div>
        ))}
      </section>

      <section className="panel stack">
        <h2>Letter to future self</h2>
        <label>
          <span className="label">Title</span>
          <input
            className="input"
            value={letterTitle}
            onChange={(e) => setLetterTitle(e.target.value)}
          />
        </label>
        <label>
          <span className="label">Open on</span>
          <input
            className="input"
            type="date"
            value={openOn}
            onChange={(e) => setOpenOn(e.target.value)}
          />
        </label>
        <textarea
          className="input"
          rows={5}
          value={letterBody}
          onChange={(e) => setLetterBody(e.target.value)}
          placeholder="Write privately…"
        />
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveLetter()}>
          Seal letter
        </button>
        <ul className="history-list">
          {letters
            .filter((l) => !l.hidden)
            .map((l) => {
              const canOpen = today >= l.openOn;
              return (
                <li key={l.id} className="history-row">
                  <div>
                    <strong>{l.title}</strong>
                    <div className="muted">Opens {l.openOn}</div>
                    {canOpen || l.openedAt ? (
                      <p>{l.body}</p>
                    ) : (
                      <p className="muted">Sealed until {l.openOn}</p>
                    )}
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    {canOpen && !l.openedAt && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void repo.openPersonalLetter(l.id).then(reload)}
                      >
                        Open
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => void repo.deletePersonalLetter(l.id).then(reload)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
        </ul>
      </section>

      <section className="panel stack">
        <h2>Private journal</h2>
        <label>
          <span className="label">Optional prompt</span>
          <select className="select" value={prompt} onChange={(e) => setPrompt(e.target.value)}>
            {SUGGESTED_PROMPTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <textarea
          className="input"
          rows={4}
          value={journalBody}
          onChange={(e) => setJournalBody(e.target.value)}
        />
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveJournal(false)}>
            Save journal
          </button>
          <button type="button" className="btn" onClick={startVoice}>
            Voice to text
          </button>
        </div>
        <ul className="history-list">
          {journals
            .filter((j) => !j.hidden)
            .slice(0, 20)
            .map((j) => (
              <li key={j.id} className="history-row">
                <div>
                  <strong>{j.date}</strong>
                  {j.fromVoice && <span className="badge badge-info"> Voice</span>}
                  {j.prompt && <div className="muted">{j.prompt}</div>}
                  <p>{j.body}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void repo.deleteJournalEntry(j.id).then(reload)}
                >
                  Delete
                </button>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
