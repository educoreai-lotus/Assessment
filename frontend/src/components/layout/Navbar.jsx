import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';

const base =
  'px-3 py-2 rounded-lg text-sm font-medium text-neutral-200 hover:text-white hover:bg-emeraldbrand-700/40 transition-colors';
const active = 'bg-emeraldbrand-700/60 text-white shadow-soft';

export default function Navbar() {
  const [theme, setTheme] = useState(null); // 'light' | 'dark' | null

  useEffect(() => {
    // load saved theme or infer from html class
    const stored = localStorage.getItem('theme');
    const initial = stored === 'dark' || stored === 'light'
      ? stored
      : (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    applyTheme(initial);
    setTheme(initial);
  }, []);

  function applyTheme(next) {
    const root = document.documentElement.classList;
    if (next === 'dark') {
      root.add('dark');
    } else {
      root.remove('dark');
    }
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
    setTheme(next);
  }

  const logoSrc = useMemo(() => {
    if (theme === 'light') return '/logo-day.jpeg';
    if (theme === 'dark') return '/logo-night.jpeg';
    // default follow current DOM
    return document.documentElement.classList.contains('dark') ? '/logo-night.jpeg' : '/logo-day.jpeg';
  }, [theme]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-neutral-200 dark:bg-neutral-950/70 dark:border-emeraldbrand-800/30">
      <div className="container-safe flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="EduCore logo" className="h-8 w-auto rounded-md shadow-soft" />
          <span className="font-semibold text-gray-900 dark:text-white">Assessment</span>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink to="/" className={({ isActive }) => `${base} ${isActive ? active : ''}`}>Home</NavLink>
          <NavLink to="/exam/baseline" className={({ isActive }) => `${base} ${isActive ? active : ''}`}>Baseline</NavLink>
          <NavLink to="/exam/postcourse" className={({ isActive }) => `${base} ${isActive ? active : ''}`}>Post-Course</NavLink>
          <NavLink to="/results" className={({ isActive }) => `${base} ${isActive ? active : ''}`}>Results</NavLink>
          <NavLink to="/dev/health" className={({ isActive }) => `${base} ${isActive ? active : ''}`}>Dev/Health</NavLink>
        </nav>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Toggle theme"
            className="px-3 py-2 rounded-lg text-sm font-medium text-neutral-200 hover:text-white hover:bg-emeraldbrand-700/40 transition-colors"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}


