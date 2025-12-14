import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ExamIntro() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const examType = (searchParams.get('examType') || '').toLowerCase();
  const examId = searchParams.get('examId') || '';
  const attemptId = searchParams.get('attemptId') || '';
  const courseId = searchParams.get('courseId') || '';
  const courseName = searchParams.get('courseName') || '';
  const userId = searchParams.get('userId') || '';
  const userName = searchParams.get('userName') || '';

  const [ack, setAck] = useState(false);

  const title = useMemo(() => {
    if (examType === 'postcourse') return 'Post-Course Assessment';
    return 'Baseline Assessment';
  }, [examType]);

  function handleStart() {
    // Persist acceptance per attempt
    if (attemptId) {
      try { localStorage.setItem(`introAccepted:${attemptId}`, 'true'); } catch {}
    }
    const params = new URLSearchParams();
    if (examId) params.set('examId', examId);
    if (attemptId) params.set('attemptId', attemptId);
    if (courseId) params.set('courseId', courseId);
    if (courseName) params.set('courseName', courseName);
    if (userId) params.set('userId', userId);
    if (userName) params.set('userName', userName);
    params.set('introAccepted', 'true');
    const qs = params.toString();
    if (examType === 'postcourse') {
      navigate(`/exam/postcourse?${qs}`);
    } else {
      navigate(`/exam/baseline?${qs}`);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Please review the rules below. You must acknowledge to begin.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium">
              Warning: Violations may result in exam termination.
            </p>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <h2 className="font-medium mb-2">What you are about to enter</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Purpose: measure your current proficiency for this assessment.</li>
              <li>Questions are designed to be medium difficulty.</li>
              <li>May include theoretical and coding tasks where applicable.</li>
            </ul>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <h2 className="font-medium mb-2">Time & submission rules</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Time is limited.</li>
              <li>Submission is final.</li>
              <li>Your exam will auto-submit if time expires.</li>
            </ul>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <h2 className="font-medium mb-2">Proctoring & integrity rules</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Camera must remain active during the exam.</li>
              <li>Tab switching is monitored and recorded.</li>
              <li>Three strikes result in automatic termination.</li>
            </ul>
          </div>

          {examType === 'postcourse' && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <h2 className="font-medium mb-2">Attempts rules</h2>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Attempts are limited by policy.</li>
                <li>Retakes only cover failed skills.</li>
                <li>Once passed, the exam is locked.</li>
              </ul>
            </div>
          )}

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <h2 className="font-medium mb-2">Identity verification (coming soon)</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              ID & face verification will be required before starting (coming soon).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="ack"
              type="checkbox"
              className="h-4 w-4"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            <label htmlFor="ack" className="text-sm">
              I have read and understand the rules.
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleStart}
            disabled={!ack}
            className={`px-4 py-2 rounded-md text-white ${ack ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'}`}
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}


