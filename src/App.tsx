import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppNav } from './components/AppNav';
import { InstallPwaBanner } from './components/InstallPwa';
import { NightlyTruthCheck } from './components/NightlyTruthCheck';
import { Dashboard } from './pages/Dashboard';
import { DailyLog } from './pages/DailyLog';
import { ProgressPage } from './pages/ProgressPage';
import { DisciplinePage } from './pages/DisciplinePage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage, applyTheme } from './pages/SettingsPage';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const init = useAppStore((s) => s.init);
  const ready = useAppStore((s) => s.ready);
  const error = useAppStore((s) => s.error);
  const toast = useAppStore((s) => s.toast);
  const setToast = useAppStore((s) => s.setToast);
  const settings = useAppStore((s) => s.settings);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (settings) applyTheme(settings.theme);
  }, [settings]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast, setToast]);

  if (!ready) {
    return <div className="empty-state">Booting PROJECT 85…</div>;
  }

  if (error) {
    return (
      <div className="empty-state panel" style={{ margin: 24 }}>
        <h1>Storage unavailable</h1>
        <p>{error}</p>
        <p className="muted">
          IndexedDB may be blocked (private mode / quota). Try another browser profile or free
          disk space.
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <AppNav />
        <main className="main-content">
          <InstallPwaBanner />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<DailyLog />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/discipline" element={<DisciplinePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <NightlyTruthCheck />
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
      <style>{`
        .toast {
          position: fixed;
          left: 50%;
          bottom: calc(var(--nav-total-height) + var(--space-4));
          transform: translateX(-50%);
          z-index: 50;
          background: var(--bg-elevated);
          border: 1px solid var(--accent);
          color: var(--text);
          padding: 12px 18px;
          border-radius: 999px;
          box-shadow: var(--shadow);
          max-width: min(90vw, 420px);
          text-align: center;
          font-size: 0.9rem;
        }
        @media (min-width: 900px) {
          .toast { bottom: 24px; }
        }
      `}</style>
    </BrowserRouter>
  );
}
