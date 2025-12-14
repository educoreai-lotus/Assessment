import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { normalizeEnvelope, parseEnvelope } from '../utils/coordinatorEnvelope';

export default function CoordinatorEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const qpEnv = searchParams.get('envelope');
      let source = null;
      if (qpEnv) {
        try {
          const decoded = decodeURIComponent(qpEnv);
          source = parseEnvelope(decoded);
        } catch {
          source = parseEnvelope(qpEnv);
        }
      } else {
        try {
          const stored = localStorage.getItem('pendingEnvelope');
          if (stored) source = parseEnvelope(stored);
        } catch {
          // ignore
        }
      }

      if (!source) {
        setError('No coordinator envelope found.');
        return;
      }

      const env = normalizeEnvelope(source);
      const action = (env.payload?.action || '').toLowerCase();

      const params = new URLSearchParams();
      // Common known fields
      if (env.payload?.exam_id) params.set('examId', String(env.payload.exam_id));
      if (env.payload?.attempt_id) params.set('attemptId', String(env.payload.attempt_id));
      if (env.payload?.course_id) params.set('courseId', String(env.payload.course_id));
      if (env.payload?.course_name) params.set('courseName', String(env.payload.course_name));
      if (env.payload?.user_id) params.set('userId', String(env.payload.user_id));
      if (env.payload?.user_name) params.set('userName', String(env.payload.user_name));

      if (action === 'start-baseline-exam') {
        params.set('examType', 'baseline');
        navigate(`/exam-intro?${params.toString()}`, { replace: true });
        return;
      }
      if (action === 'start-postcourse-exam') {
        params.set('examType', 'postcourse');
        navigate(`/exam-intro?${params.toString()}`, { replace: true });
        return;
      }

      setError('Unsupported coordinator action.');
    } catch (e) {
      setError(e?.message || 'Failed to parse coordinator envelope.');
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h1 className="text-xl font-semibold mb-2">Coordinator Entry</h1>
        {error ? (
          <div className="text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        ) : (
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Parsing coordinator payload...
          </div>
        )}
      </div>
    </div>
  );
}


