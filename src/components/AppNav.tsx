import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: '◆' },
  { to: '/log', label: 'Daily Log', icon: '✎' },
  { to: '/progress', label: 'Progress', icon: '↗' },
  { to: '/discipline', label: 'Discipline', icon: '▣' },
  { to: '/history', label: 'History', icon: '▦' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
] as const;

export function AppNav() {
  return (
    <>
      <aside className="sidebar" aria-label="Primary">
        <div className="sidebar-brand">
          <span className="brand">PROJECT 85</span>
          <span className="dim" style={{ fontSize: '0.75rem' }}>
            Mission Control
          </span>
        </div>
        <nav className="sidebar-nav">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span aria-hidden>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <nav className="bottom-nav" aria-label="Primary">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => `bottom-item${isActive ? ' active' : ''}`}
          >
            <span className="bottom-icon" aria-hidden>
              {l.icon}
            </span>
            <span>{l.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        .sidebar {
          display: none;
          background: var(--bg-elevated);
          border-right: 1px solid var(--border-subtle);
          padding: var(--space-6) var(--space-4);
          position: sticky;
          top: 0;
          height: 100dvh;
        }
        .sidebar-brand {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: var(--space-8);
          padding: 0 var(--space-2);
        }
        .sidebar-brand .brand {
          font-size: 1.25rem;
          color: var(--accent);
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: var(--touch);
          padding: 0 12px;
          border-radius: var(--radius);
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.92rem;
        }
        .nav-item.active,
        .nav-item:hover {
          background: var(--accent-soft);
          color: var(--text);
        }
        .nav-item.active {
          color: var(--accent-strong);
        }
        .nav-item:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        @media (min-width: 900px) {
          .sidebar { display: block; }
        }
      `}</style>
    </>
  );
}
