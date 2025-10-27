import React from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function Header({ onToggleTheme, theme }) {
  const isDarkMode = theme === 'night-mode' || theme === 'dark' || document.body.classList.contains('night-mode');
  const logoSrc = isDarkMode ? '/logo-night.jpeg' : '/logo-day.jpeg';

  const handleLogout = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  return (
    <header className="header header-bar transition-colors">
      <div className="left-section">
        <img src={logoSrc} alt="Educore AI" className="header-logo" />
        <h1 className="app-title">
          <span className="text-emerald-500 font-bold text-xl">Assessment <span className="text-gray-300 font-normal">| Testing & Exams</span></span>
        </h1>
      </div>

      <nav className="nav-center">
        <ul className="nav-links">
          <li><NavLink to="/welcome-baseline">Baseline Exam</NavLink></li>
          <li><NavLink to="/welcome-postcourse">Post-Course Exam</NavLink></li>
          <li><NavLink to="/post-course-results">Results</NavLink></li>
        </ul>
      </nav>

      <div className="right-section header-controls">
        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="theme-toggle transition-colors"
          title={isDarkMode ? 'Switch to day mode' : 'Switch to night mode'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  )
}


