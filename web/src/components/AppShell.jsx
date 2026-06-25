import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { IconButton } from './ui/Button.jsx';
import './AppShell.css';

const NAV = [
  { to: '/', label: 'Dashboard', end: true, icon: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5' },
  {
    to: '/transactions',
    label: 'Transactions',
    icon: 'M4 7h16M4 7l3-3M4 7l3 3M20 17H4m16 0-3-3m3 3-3 3',
  },
  { to: '/accounts', label: 'Accounts', icon: 'M3 7h18v12H3zM3 11h18M7 15h4' },
  { to: '/budgets', label: 'Budgets', icon: 'M12 3a9 9 0 1 0 9 9h-9z M12 3v9h9' },
  { to: '/reports', label: 'Reports', icon: 'M5 20V10M12 20V4M19 20v-7' },
  {
    to: '/categories',
    label: 'Categories',
    icon: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z',
  },
];

function NavIcon({ path }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isDark, toggle } = useTheme();
  const location = useLocation();

  const pageTitle =
    NAV.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )?.label ?? 'Settings';

  useDocumentTitle(pageTitle);

  const initials = (user?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="shell">
      <a className="shell__skip" href="#main">
        Skip to content
      </a>

      <aside className={`shell__sidebar ${navOpen ? 'is-open' : ''}`}>
        <div className="shell__brand">
          <span className="shell__logo" aria-hidden="true">
            Rs
          </span>
          <span className="shell__brand-name">Rs</span>
        </div>

        <nav className="shell__nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `shell__link ${isActive ? 'is-active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <NavIcon path={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shell__sidebar-footer">
          <NavLink
            to="/settings"
            className={({ isActive }) => `shell__link ${isActive ? 'is-active' : ''}`}
            onClick={() => setNavOpen(false)}
          >
            <NavIcon path="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10.6 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Tapping outside the drawer closes it on small screens. */}
      {navOpen && <div className="shell__scrim" onClick={() => setNavOpen(false)} />}

      <div className="shell__main">
        <header className="shell__header">
          <IconButton
            label="Open navigation"
            className="shell__menu"
            onClick={() => setNavOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </IconButton>

          <h1 className="shell__heading">{pageTitle}</h1>

          <div className="shell__header-actions">
            <IconButton
              label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggle}
            >
              {isDark ? (
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </IconButton>

            <div className="shell__user">
              <span className="shell__avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="shell__user-name">{user?.name}</span>
            </div>

            <button type="button" className="btn btn--ghost btn--sm" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>

        <main className="shell__content" id="main">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
