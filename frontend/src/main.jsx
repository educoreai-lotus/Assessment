import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import BaselineExam from './pages/BaselineExam'
import PostCourseExam from './pages/PostCourseExam'
import PostCourseResults from './pages/PostCourseResults'
import './index.css'
import './styles/DarkEmerald.css'
// Navbar with theme toggle removed per revert

function ThemeContainer({ children }) {
  const [theme, setTheme] = useState('day-mode');
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'day-mode';
    document.body.classList.remove('day-mode', 'night-mode');
    document.body.classList.add(storedTheme);
    setTheme(storedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'day-mode' ? 'night-mode' : 'day-mode';
    document.body.classList.remove('day-mode', 'night-mode');
    document.body.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  };

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="header transition-colors">
        <div className="nav-container">
          <div className="logo">Assessment</div>
          <ul className="nav-links">
            <li><Link to="/">Baseline</Link></li>
            <li><Link to="/postcourse">Post-Course</Link></li>
            <li><Link to="/post-course-results">Results</Link></li>
          </ul>
          <div className="header-controls">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="theme-toggle transition-colors"
              title={theme === 'night-mode' ? 'Switch to day mode' : 'Switch to night mode'}
            >
              {theme === 'night-mode' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>
      <div className="transition-colors" style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {children}
      </div>
    </>
  );
}

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeContainer>
        <main id="main" style={{ paddingTop: '80px' }}>
          <Routes>
            <Route path="/" element={<BaselineExam />} />
            <Route path="/postcourse" element={<PostCourseExam />} />
            <Route path="/post-course-results" element={<PostCourseResults />} />
          </Routes>
        </main>
      </ThemeContainer>
    </BrowserRouter>
  </React.StrictMode>
)


