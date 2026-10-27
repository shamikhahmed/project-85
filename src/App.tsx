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
    return (
      <div className="empty-state">
        <h2>PROJECT 85</h2>
        <p>Warming up your local mission control…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state panel" style={{ margin: 24 }}>
        <h2>Can’t reach local storage</h2>
        <p>{error}</p>
        <p className="muted">
          Private browsing or a full disk can block IndexedDB. Try a normal browser profile, free
          some space, then reopen the app.
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
    </BrowserRouter>
  );
}
