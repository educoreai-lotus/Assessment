import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import BaselineExam from './pages/BaselineExam'
import PostCourseExam from './pages/PostCourseExam'
import PostCourseResults from './pages/PostCourseResults'
import './index.css'

function ThemeContainer({ children }) {
  useEffect(() => {
    const body = document.body;
    const saved = window.localStorage.getItem('theme-mode');
    const initial = saved === 'night' ? 'night-mode' : 'day-mode';
    if (!body.classList.contains('day-mode') && !body.classList.contains('night-mode')) {
      body.classList.add(initial);
    }
    function setMode(mode) {
      body.classList.remove('day-mode', 'night-mode');
      body.classList.add(mode === 'night' ? 'night-mode' : 'day-mode');
      window.localStorage.setItem('theme-mode', mode === 'night' ? 'night' : 'day');
    }
    window.setThemeMode = (mode) => setMode(mode);
    window.toggleThemeMode = () => {
      const isNight = body.classList.contains('night-mode');
      setMode(isNight ? 'day' : 'night');
    };
  }, []);
  return children;
}

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeContainer>
        <a href="#main" className="skip-link">Skip to content</a>
        <div className="bg-animation" />
        <div className="particles" aria-hidden="true" />
        <header className="header">
          <div className="nav-container">
            <div className="logo">Assessment</div>
            <ul className="nav-links">
              <li><Link to="/">Baseline</Link></li>
              <li><Link to="/post-course">Post-Course</Link></li>
              <li><Link to="/post-course-results">Results</Link></li>
            </ul>
            <div className="header-controls">
              <button className="theme-toggle" aria-label="Toggle theme" onClick={() => window.toggleThemeMode && window.toggleThemeMode()}>
                ☾
              </button>
            </div>
          </div>
        </header>
        <main id="main" style={{ paddingTop: '80px' }}>
          <Routes>
            <Route path="/" element={<BaselineExam />} />
            <Route path="/post-course" element={<PostCourseExam />} />
            <Route path="/post-course-results" element={<PostCourseResults />} />
          </Routes>
        </main>
      </ThemeContainer>
    </BrowserRouter>
  </React.StrictMode>
)


