import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { examApi } from '../services/examApi';
import { useRef } from 'react';

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
  const skillName = searchParams.get('skillName') || '';

  const [ack, setAck] = useState(false);
  const [ctxSaved, setCtxSaved] = useState(examType !== 'baseline');
  const [ctxError, setCtxError] = useState('');
  const [startingExam, setStartingExam] = useState(false);
  const didPostContext = useRef(false);

  const title = useMemo(() => {
    if (examType === 'postcourse') return 'Post-Course Assessment';
    return 'Baseline Assessment';
  }, [examType]);

  // Persist baseline context from Directory URL (userId, skillName) before start
  useEffect(() => {
    if (examType !== 'baseline') return;
    const uid = (userId || '').trim();
    const compName = (skillName || '').trim();
    if (!uid || !compName) {
      setCtxError('Missing baseline context from Directory');
      setCtxSaved(false);
      return;
    }
    if (didPostContext.current) return;
    didPostContext.current = true;
    (async () => {
      try {
        await examApi.saveContext({
          exam_type: 'baseline',
          user_id: uid,
          competency_name: decodeURIComponent(compName),
        });
        // eslint-disable-next-line no-console
        console.log('[INTRO][CONTEXT_SAVED]', { exam_type: 'baseline', user_id: uid, competency_name: decodeURIComponent(compName) });
        // eslint-disable-next-line no-console
        console.log('[FE][CONTEXT][POSTED_ONCE]', { userId: uid, skillName: decodeURIComponent(compName) });
        setCtxSaved(true);
        setCtxError('');
      } catch {
        setCtxSaved(false);
        setCtxError('Failed to save baseline context. Please refresh.');
      }
    })();
  }, [examType, userId, skillName]);

  async function handleStart() {
    if (startingExam) return;
    if (examType === 'baseline' && !ctxSaved) {
      // block start until context saved
      return;
    }
    setStartingExam(true);
    // eslint-disable-next-line no-console
    console.log('[POSTCOURSE][START][CLICK]');
    try {
      if (examType === 'postcourse') {
        // Frontend has no context; request backend to fetch coverage_map and create exam
        const resp = await examApi.postcourseCoverage();
        const eid = resp?.exam_id || '';
        const aid = resp?.attempt_id || '';
        if (!eid || !aid) throw new Error('failed_to_create_postcourse_exam');
        try { localStorage.setItem(`introAccepted:${aid}`, 'true'); } catch {}
        const qp = new URLSearchParams();
        qp.set('examId', String(eid));
        qp.set('attemptId', String(aid));
        qp.set('introAccepted', 'true');
        navigate(`/exam/postcourse?${qp.toString()}`);
        return;
      }
      // Baseline: pass-through with known params
      const params = new URLSearchParams();
      if (examId) params.set('examId', examId);
      if (attemptId) params.set('attemptId', attemptId);
      if (courseId) params.set('courseId', courseId);
      if (courseName) params.set('courseName', courseName);
      if (userId) params.set('userId', userId);
      if (userName) params.set('userName', userName);
      if (skillName) params.set('skillName', skillName);
      params.set('introAccepted', 'true');
      navigate(`/exam/baseline?${params.toString()}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[POSTCOURSE][START][FAILED]', err);
      if (examType === 'postcourse') {
        setCtxError('Failed to start post-course exam. Please try again.');
      }
      setStartingExam(false); // allow retry on failure
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white/80 dark:bg-zinc-900 rounded-xl shadow-sm p-6 text-left">
        <div className="mb-4 text-left">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Please review the information below and acknowledge to begin.
          </p>
        </div>

        <div className="space-y-4 text-left">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow-sm">
            <p className="text-amber-900 dark:text-amber-200 font-medium">
              ⚠️ Please note: Any violation of the rules may result in exam termination.
            </p>
          </div>

          <div className="p-5 bg-neutral-50 dark:bg-zinc-900/30 rounded-lg shadow-sm">
            <h2 className="font-medium mb-2">What you’re about to enter</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Purpose: Measures your current proficiency level.</li>
              <li>Difficulty: Medium difficulty.</li>
              <li>Format: May include theoretical questions and coding tasks.</li>
            </ul>
          </div>

          <div className="p-5 bg-neutral-50 dark:bg-zinc-900/30 rounded-lg shadow-sm">
            <h2 className="font-medium mb-2">Time & submission rules</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>The exam is time-limited.</li>
              <li>Submission is final.</li>
              <li>The exam auto-submits when time expires.</li>
            </ul>
          </div>

          <div className="p-5 bg-neutral-50 dark:bg-zinc-900/30 rounded-lg shadow-sm">
            <h2 className="font-medium mb-2">Proctoring & integrity rules</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Camera must remain active during the exam.</li>
              <li>Tab switching is monitored.</li>
              <li>Three violations result in automatic termination.</li>
            </ul>
          </div>

          {examType === 'postcourse' && (
            <div className="p-5 bg-neutral-50 dark:bg-zinc-900/30 rounded-lg shadow-sm">
              <h2 className="font-medium mb-2">Attempts policy</h2>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Attempts are limited.</li>
                <li>Retakes include failed skills only.</li>
                <li>Exam locks after all skills are passed.</li>
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 text-left">
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
            disabled={!ack || !ctxSaved || startingExam}
            className={`px-4 py-2 rounded-md text-white ${(ack && ctxSaved && !startingExam) ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'}`}
          >
            {startingExam ? 'Starting exam…' : 'Start Exam'}
          </button>
        </div>

        {examType === 'baseline' && ctxError && (
          <div className="mt-3 text-sm text-red-400">{ctxError}</div>
        )}
      </div>
    </div>
  );
}


