import { NavLink } from 'react-router-dom';

const base =
  'px-3 py-2 rounded-lg text-sm font-medium text-neutral-200 hover:text-white hover:bg-emeraldbrand-700/40 transition-colors';
const active = 'bg-emeraldbrand-700/60 text-white shadow-soft';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-neutral-950/70 border-b border-emeraldbrand-800/30">
      <div className="container-safe flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-primary shadow-soft" />
          <span className="font-semibold text-white">EduCore AI</span>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink to="/" className={({ isActive }) => `${base} ${isActive ? active : ''}`}>Home</NavLink>
          <NavLink to="/exam/baseline" className={({ isActive }) => `${base} ${isActive ? active : ''}`}>Baseline</NavLink>
          <NavLink to="/exam/postcourse" className={({ isActive }) => `${base} ${isActive ? active : ''}`}>Post-Course</NavLink>
          <NavLink to="/results" className={({ isActive }) => `${base} ${isActive ? active : ''}`}>Results</NavLink>
          <NavLink to="/dev/health" className={({ isActive }) => `${base} ${isActive ? active : ''}`}>Dev/Health</NavLink>
        </nav>
      </div>
    </header>
  );
}


