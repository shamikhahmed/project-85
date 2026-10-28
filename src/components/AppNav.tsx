import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const LINKS: {
  to: string;
  label: string;
  short: string;
  icon: ReactNode;
  /** Hide from bottom nav to avoid overcrowding */
  desktopOnly?: boolean;
}[] = [
  {
    to: '/',
    label: 'Today',
    short: 'Today',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/log',
    label: 'Log',
    short: 'Log',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M5 15.5l1.2-4.4L13.8 3.5a1.6 1.6 0 012.2 2.2L8.4 13.3 4 14.5l1-1z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/physique',
    label: 'Physique',
    short: 'Body',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 8v4.5M7 9.5l3 1.5 3-1.5M7.5 18l2.5-5.5L12.5 18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/health',
    label: 'Health',
    short: 'Health',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M4 10h3l1.5-3 2 6L13 10h3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/progress',
    label: 'Progress',
    short: 'Proof',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M3.5 14.5l4.2-4.2 2.6 2.6 6.2-6.4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12.5 6.5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/motivation',
    label: 'Motivation',
    short: 'Why',
    desktopOnly: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M10 3.5l1.6 3.4 3.7.4-2.8 2.5.8 3.6L10 11.8 6.7 13.4l.8-3.6L4.7 7.3l3.7-.4L10 3.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/timeline',
    label: 'Timeline',
    short: 'Story',
    desktopOnly: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M4 4.5h12M4 10h12M4 15.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/discipline',
    label: 'Review',
    short: 'Review',
    desktopOnly: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="4" y="3.5" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 8h6M7 11.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    short: 'History',
    desktopOnly: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="3.5" y="4.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 3.5v2.5M13 3.5v2.5M3.5 9h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    short: 'More',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 3.5v1.4M10 15.1v1.4M3.5 10h1.4M15.1 10h1.4M5.4 5.4l1 1M13.6 13.6l1 1M14.6 5.4l-1 1M6.4 13.6l-1 1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function AppNav() {
  const location = useLocation();
  const mobile = LINKS.filter((l) => !l.desktopOnly);
  return (
    <>
      <aside className="sidebar" aria-label="Primary">
        <div className="sidebar-brand">
          <span className="brand">
            PROJECT <span className="hero-brand-num">85</span>
          </span>
          <span className="dim" style={{ fontSize: 'var(--text-caption)' }}>
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
              <span className="nav-icon">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <nav className="bottom-nav" aria-label="Primary">
        {mobile.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => {
              // Body tab covers Physique + Body Intelligence
              const bodyActive =
                l.to === '/physique' &&
                (location.pathname === '/physique' || location.pathname === '/body');
              return `bottom-item${isActive || bodyActive ? ' active' : ''}`;
            }}
            aria-label={l.label}
          >
            <span className="bottom-icon">{l.icon}</span>
            <span>{l.short}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
