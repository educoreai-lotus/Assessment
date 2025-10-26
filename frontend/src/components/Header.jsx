import React from 'react'
import { Link } from 'react-router-dom'

export default function Header({ onToggleTheme, theme }) {
  const isNight = theme === 'night-mode' || theme === 'dark' || document.body.classList.contains('night-mode');
  const logoSrc = isNight ? '/logo-night.jpg' : '/logo-day.jpg';
  return (
    <header className="header transition-colors">
      <div className="nav-container">
        <div className="brand">
          <div className="brand-logo" aria-hidden="true" style={{ marginRight: '10px' }}>
            <img src={logoSrc} alt="Educore AI Logo" height={40} style={{ width: 'auto', borderRadius: 6, transition: 'opacity 0.3s ease' }} />
          </div>
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
            title={theme === 'night-mode' ? 'Switch to day mode' : 'Switch to night mode'}
          >
            {theme === 'night-mode' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  )
}


