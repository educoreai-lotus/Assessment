import { Navigate, useSearchParams } from 'react-router-dom';
import ExamIntro from '../pages/ExamIntro';
import { isBaselineOnlyLaunch } from '../services/baselineOnlyLaunch';

export function BlockPostcourseWhenBaselineOnly({ children }) {
  if (isBaselineOnlyLaunch()) return <Navigate to="/" replace />;
  return children;
}

export function ExamIntroWithBaselineOnlyGuard() {
  const [searchParams] = useSearchParams();
  const examType = (searchParams.get('examType') || '').toLowerCase();
  if (isBaselineOnlyLaunch() && examType === 'postcourse') {
    return <Navigate to="/" replace />;
  }
  return <ExamIntro />;
}
