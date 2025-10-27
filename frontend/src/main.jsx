import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import BaselineExam from './pages/BaselineExam'
import WelcomeExam from './pages/WelcomeExam'
import PostCourseExam from './pages/PostCourseExam'
import PostCourseResults from './pages/PostCourseResults'
import './index.css'
import './styles/DarkEmerald.css'
import Header from './components/Header'
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
      <Header onToggleTheme={toggleTheme} theme={theme} />
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
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="/welcome" element={<WelcomeExam />} />
            <Route path="/postcourse" element={<PostCourseExam />} />
            <Route path="/baseline" element={<BaselineExam />} />
            <Route path="/post-course-results" element={<PostCourseResults />} />
          </Routes>
        </main>
      </ThemeContainer>
    </BrowserRouter>
  </React.StrictMode>
)


