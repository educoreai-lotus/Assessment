import React, { useEffect, useState } from "react";

export function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="ml-4 rounded-full p-2 transition-all duration-300 bg-gray-200 dark:bg-gray-700 hover:scale-110"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="text-gray-700 dark:text-yellow-400">{darkMode ? '☀️' : '🌙'}</span>
    </button>
  );
}

export default function Navbar() {
  return (
    <header className="w-full flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="font-bold">Assessment</div>
      <div className="flex items-center">
        <ThemeToggle />
      </div>
    </header>
  );
}
