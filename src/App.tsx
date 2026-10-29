import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppNav } from './components/AppNav';
import { CapAutoHealthSync } from './components/CapAutoHealthSync';
import { CapDeepLinks } from './components/CapDeepLinks';
import { InstallPwaBanner } from './components/InstallPwa';
import { NightlyTruthCheck } from './components/NightlyTruthCheck';
import { Dashboard } from './pages/Dashboard';
import { DailyLog } from './pages/DailyLog';
import { ProgressPage } from './pages/ProgressPage';
import { DisciplinePage } from './pages/DisciplinePage';
import { HistoryPage } from './pages/HistoryPage';
import { applyTheme } from './lib/theme';
import { SettingsPage } from './pages/SettingsPage';
import { BodyMapPage } from './pages/BodyMapPage';
import { BodyIntelligencePage } from './pages/BodyIntelligencePage';
import { MotivationPage } from './pages/MotivationPage';
import { TimelinePage } from './pages/TimelinePage';
import { HealthIntelligencePage } from './pages/HealthIntelligencePage';
import { TrainingPage } from './pages/TrainingPage';
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
      <div className="empty-state boot">
        <h2>
          PROJECT <span className="hero-brand-num">85</span>
        </h2>
        <p className="muted">Opening your private mission…</p>
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

  // GitHub Pages has no server rewrite for SPA paths — use HashRouter when base ≠ /
  const useHash = import.meta.env.BASE_URL !== '/';
  const Router = useHash ? HashRouter : BrowserRouter;
  const routerBasename = useHash
    ? undefined
    : import.meta.env.BASE_URL === '/'
      ? undefined
      : import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <Router basename={routerBasename}>
      <div className="app-shell">
        <CapDeepLinks />
        <CapAutoHealthSync />
        <AppNav />
        <main className="main-content">
          <InstallPwaBanner />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<DailyLog />} />
            <Route path="/train" element={<TrainingPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/discipline" element={<DisciplinePage />} />
            <Route path="/physique" element={<BodyMapPage />} />
            <Route path="/body" element={<BodyIntelligencePage />} />
            <Route path="/health" element={<HealthIntelligencePage />} />
            <Route path="/motivation" element={<MotivationPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
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
    </Router>
  );
}
