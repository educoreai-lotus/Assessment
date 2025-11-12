import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';

const base =
  'px-3 py-2 rounded-lg text-sm font-medium text-neutral-200 hover:text-white hover:bg-emeraldbrand-700/40 transition-colors';
const active = 'bg-emeraldbrand-700/60 text-white shadow-soft';

export default function Navbar() {
  const [theme, setTheme] = useState(null); // 'day' | 'night' | null

  useEffect(() => {
    // apply stored theme if present (non-destructive default)
    const stored = localStorage.getItem('theme');
    if (stored === 'day' || stored === 'night') {
      applyTheme(stored);
      setTheme(stored);
    }
  }, []);

  function applyTheme(next) {
    const b = document.body.classList;
    b.remove('day-mode', 'night-mode');
    if (next === 'day') b.add('day-mode');
    if (next === 'night') b.add('night-mode');
  }

  function toggleTheme() {
    const next = theme === 'night' ? 'day' : 'night';
    applyTheme(next);
    localStorage.setItem('theme', next);
    setTheme(next);
  }

  const logoSrc = useMemo(() => {
    if (theme === 'day') return '/logo-day.jpeg';
    if (theme === 'night') return '/logo-night.jpeg';
    // default to night logo to match dark Tailwind base until user chooses
    return '/logo-night.jpeg';
  }, [theme]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-neutral-950/70 border-b border-emeraldbrand-800/30">
      <div className="container-safe flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="EduCore logo" className="h-8 w-auto rounded-md shadow-soft" />
          <span className="font-semibold text-white">Assessment</span>
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
            title={theme === 'night' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {theme === 'night' ? '🌞' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}


