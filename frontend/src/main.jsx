import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import BaselineExam from './pages/BaselineExam'
import PostCourseExam from './pages/PostCourseExam'
import PostCourseResults from './pages/PostCourseResults'
import './index.css'
import Navbar from './components/Navbar'

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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-500 ease-in-out">
        <a href="#main" className="skip-link">Skip to content</a>
        <Navbar />
        <main id="main" style={{ paddingTop: '80px' }}>
          <Routes>
            <Route path="/" element={<BaselineExam />} />
            <Route path="/postcourse" element={<PostCourseExam />} />
            <Route path="/post-course-results" element={<PostCourseResults />} />
          </Routes>
        </main>
        </div>
      </ThemeContainer>
    </BrowserRouter>
  </React.StrictMode>
)


