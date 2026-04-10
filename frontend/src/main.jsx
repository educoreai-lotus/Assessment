import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './index.css';
import { getAccessToken, ingestAccessTokenFromHash } from './services/accessToken';
import App from './App.jsx';
import HomePage from './pages/HomePage.jsx';
import Baseline from './pages/Baseline.jsx';
import PostCourseExam from './pages/exam/PostCourseExam.jsx';
import {
  BlockPostcourseWhenBaselineOnly,
  ExamIntroWithBaselineOnlyGuard,
} from './components/BaselineOnlyRouteGuards.jsx';
import CoordinatorEntry from './pages/CoordinatorEntry.jsx';
import ResultsDashboard from './pages/results/ResultsDashboard.jsx';
import BaselineResults from './pages/BaselineResults.jsx';
import PostCourseResults from './pages/PostCourseResults.jsx';
import Health from './pages/dev/Health.jsx';
import Cancelled from './pages/exam/Cancelled.jsx';

ingestAccessTokenFromHash();

function RequireAccessToken({ children }) {
  const token = getAccessToken();
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function protectedPage(element) {
  return <RequireAccessToken>{withMotion(element)}</RequireAccessToken>;
}

const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: withMotion(<HomePage />) },
      { path: 'exam/baseline', element: protectedPage(<Baseline />) },
      {
        path: 'exam/postcourse',
        element: protectedPage(
          <BlockPostcourseWhenBaselineOnly>
            <PostCourseExam />
          </BlockPostcourseWhenBaselineOnly>,
        ),
      },
      { path: 'exam-intro', element: protectedPage(<ExamIntroWithBaselineOnlyGuard />) },
      { path: 'coordinator-entry', element: protectedPage(<CoordinatorEntry />) },
      { path: 'results', element: protectedPage(<ResultsDashboard />) },
      { path: 'results/baseline', element: protectedPage(<BaselineResults />) },
      { path: 'results/baseline/:attemptId', element: protectedPage(<BaselineResults />) },
      {
        path: 'results/postcourse',
        element: protectedPage(
          <BlockPostcourseWhenBaselineOnly>
            <PostCourseResults />
          </BlockPostcourseWhenBaselineOnly>,
        ),
      },
      {
        path: 'results/postcourse/:attemptId',
        element: protectedPage(
          <BlockPostcourseWhenBaselineOnly>
            <PostCourseResults />
          </BlockPostcourseWhenBaselineOnly>,
        ),
      },
      { path: 'exam/cancelled', element: protectedPage(<Cancelled />) },
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
