import React from 'react'
import { Link } from 'react-router-dom'

export default function Header({ onToggleTheme, theme }) {
  const isDarkMode = theme === 'night-mode' || theme === 'dark' || document.body.classList.contains('night-mode');
  const logoSrc = isDarkMode ? '/logo-night.jpeg' : '/logo-day.jpeg';
  return (
    <header className="header transition-colors">
      <div className="nav-container">
        <div className="brand">
          <img
            src={logoSrc}
            alt="Educore AI"
            className="logo"
          />
          <span className="logo">Assessment</span>
        </div>
        <ul className="nav-links">
          <li><Link to="/">Baseline</Link></li>
          <li><Link to="/postcourse">Post-Course</Link></li>
          <li><Link to="/post-course-results">Results</Link></li>
        </ul>
        <div className="header-controls">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="theme-toggle transition-colors"
            title={isDarkMode ? 'Switch to day mode' : 'Switch to night mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  )
}


