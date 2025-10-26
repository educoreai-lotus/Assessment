import React from 'react'
import { Link } from 'react-router-dom'
import LightLogo from '../assets/WhatsApp Image 2025-10-26 at 20.42.27.jpeg'
import DarkLogo from '../assets/WhatsApp Image 2025-10-26 at 20.42.27 (1).jpeg'

export default function Header({ onToggleTheme, theme }) {
  return (
    <header className="header transition-colors">
      <div className="nav-container">
        <div className="brand">
          <div className="brand-logo" aria-hidden="true">
            <img src={LightLogo} alt="Educore AI Logo" className="logo-light" height={40} />
            <img src={DarkLogo} alt="Educore AI Logo" className="logo-dark" height={40} />
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


