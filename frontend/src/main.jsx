import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './index.css';
import App from './App.jsx';
import HomePage from './pages/HomePage.jsx';
import Baseline from './pages/Baseline.jsx';
import PostCourseExam from './pages/exam/PostCourseExam.jsx';
import ResultsDashboard from './pages/results/ResultsDashboard.jsx';
import BaselineResults from './pages/BaselineResults.jsx';
import PostCourseResults from './pages/PostCourseResults.jsx';
import Health from './pages/dev/Health.jsx';
import Cancelled from './pages/exam/Cancelled.jsx';

const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: withMotion(<HomePage />) },
      { path: 'exam/baseline', element: withMotion(<Baseline />) },
      { path: 'exam/postcourse', element: withMotion(<PostCourseExam />) },
      { path: 'results', element: withMotion(<ResultsDashboard />) },
      { path: 'results/baseline', element: withMotion(<BaselineResults />) },
      { path: 'results/baseline/:attemptId', element: withMotion(<BaselineResults />) },
      { path: 'results/postcourse', element: withMotion(<PostCourseResults />) },
      { path: 'results/postcourse/:attemptId', element: withMotion(<PostCourseResults />) },
      { path: 'exam/cancelled', element: withMotion(<Cancelled />) },
      { path: 'dev/health', element: withMotion(<Health />) },
    ],
  },
];

function withMotion(element) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {element}
      </motion.div>
    </AnimatePresence>
  );
}

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
