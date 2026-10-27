import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Today', short: 'Today', icon: '◆' },
  { to: '/log', label: 'Log', short: 'Log', icon: '✎' },
  { to: '/progress', label: 'Progress', short: 'Proof', icon: '↗' },
  { to: '/discipline', label: 'Review', short: 'Review', icon: '▣' },
  { to: '/history', label: 'History', short: 'History', icon: '▦' },
  { to: '/settings', label: 'Settings', short: 'More', icon: '⚙' },
] as const;

export function AppNav() {
  return (
    <>
      <aside className="sidebar" aria-label="Primary">
        <div className="sidebar-brand">
          <span className="brand">
            PROJECT <span style={{ color: 'var(--accent)' }}>85</span>
          </span>
          <span className="dim" style={{ fontSize: '0.75rem' }}>
            Local · private · offline
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
            aria-label={l.label}
          >
            <span className="bottom-icon" aria-hidden>
              {l.icon}
            </span>
            <span>{l.short}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        .sidebar {
          display: none;
          background: var(--bg-elevated);
          border-right: 1px solid var(--border-subtle);
          padding: var(--space-6) var(--space-4);
          padding-top: calc(var(--space-6) + var(--safe-top));
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
          font-size: 1.3rem;
          font-weight: 800;
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
          font-weight: 650;
          font-size: 0.95rem;
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
