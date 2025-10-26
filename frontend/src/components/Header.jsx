import React from 'react'
import { Link } from 'react-router-dom'

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
        <h1 className="app-title">Assessment</h1>
      </div>

      <nav className="nav-center">
        <ul className="nav-links">
          <li><Link to="/">Baseline</Link></li>
          <li><Link to="/postcourse">Post-Course</Link></li>
          <li><Link to="/post-course-results">Results</Link></li>
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


