import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import QuestionCard from '../components/QuestionCard';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import CameraPreview from '../components/CameraPreview';
import { examApi } from '../services/examApi';
import { http } from '../services/http';

export default function Baseline() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialExamId = useMemo(() => {
    const qp = searchParams.get('examId');
    if (qp) return qp;
    const stored = localStorage.getItem('exam_baseline_id');
    if (stored) return stored;
    return null;
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState('');

  const [examId, setExamId] = useState(initialExamId);
  const [attemptId, setAttemptId] = useState(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraOk, setCameraOk] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [strikes, setStrikes] = useState(0);

  // Bootstrap: resolve user_id -> exam_id -> attempt_id
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        setLoading(true);
        setError('');

        // Resolve demo user id (persist for baseline uniqueness)
        let userId = localStorage.getItem('demo_user_id');
        if (!userId) {
          userId = 'u_123';
          localStorage.setItem('demo_user_id', userId);
        }

        let resolvedExamId = examId;
        let resolvedAttemptId = null;

        try {
          const created = await examApi.create({ user_id: userId, exam_type: 'baseline' });
          resolvedExamId = String(created?.exam_id ?? '');
          resolvedAttemptId = created?.attempt_id ?? null;
          if (resolvedExamId) {
            localStorage.setItem('exam_baseline_id', resolvedExamId);
          }
        } catch (err) {
          const apiErr = err?.response?.data?.error || '';
          if (apiErr === 'baseline_already_exists') {
            const list = await http.get(`/api/attempts/user/${encodeURIComponent(userId)}`).then(r => r.data);
            const baseline = Array.isArray(list) ? list.find(a => a.exam_type === 'baseline') : null;
            if (baseline) {
              resolvedExamId = String(baseline.exam_id);
              resolvedAttemptId = baseline.attempt_id;
              if (resolvedExamId) {
                localStorage.setItem('exam_baseline_id', resolvedExamId);
              }
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }

        if (!resolvedAttemptId) {
          const list = await http.get(`/api/attempts/user/${encodeURIComponent(localStorage.getItem('demo_user_id') || 'u_123')}`).then(r => r.data);
          const baseline = Array.isArray(list) ? list.find(a => String(a?.exam_id) === String(resolvedExamId)) : null;
          resolvedAttemptId = baseline?.attempt_id ?? null;
        }

        if (!resolvedExamId || !resolvedAttemptId) {
          throw new Error('Unable to resolve exam or attempt. Please try again.');
        }

        if (!mounted) return;
        setExamId(resolvedExamId);
        setAttemptId(resolvedAttemptId);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.error || e?.message || 'Failed to initialize baseline exam');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []); // initial mount

  // Start exam only after camera is ready and backend session is active
  useEffect(() => {
    let cancelled = false;
    async function startExamIfReady() {
      if (!examId || !attemptId) return;
      if (!cameraReady || !cameraOk) return;
      try {
        setQuestionsLoading(true);
        const data = await examApi.start(examId, { attempt_id: attemptId });
        if (cancelled) return;
        const normalized = Array.isArray(data?.questions)
          ? data.questions.map((p, idx) => {
              const qTypeRaw = (p?.metadata?.type || p?.type || 'mcq');
              const uiType = qTypeRaw === 'open' ? 'text' : qTypeRaw;
              const text =
                typeof p?.prompt === 'string'
                  ? p.prompt
                  : (p?.prompt?.question || p?.prompt?.stem || '');
              const optsRaw = Array.isArray(p?.options) ? p.options : (Array.isArray(p?.prompt?.choices) ? p.prompt.choices : []);
              const opts = Array.isArray(optsRaw) ? optsRaw.map((o) => (typeof o === 'string' ? o : JSON.stringify(o))) : [];
              return {
                id: p?.question_id || p?.qid || p?.id || String(idx + 1),
                originalId: p?.question_id || p?.qid || p?.id || String(idx + 1),
                type: uiType,
                prompt: text,
                options: opts,
                skill: p?.prompt?.skill_name || p?.skill_name || p?.skill || p?.skill_id || 'General',
                skill_id: p?.skill_id || null,
              };
            })
          : [];
        setQuestions(normalized);
        setCurrentIdx(0);
        setAnswers({});
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || 'Failed to start exam');
      } finally {
        setQuestionsLoading(false);
      }
    }
    startExamIfReady();
    return () => {
      cancelled = false;
    };
  }, [examId, attemptId, cameraReady, cameraOk]);

  // Anti-cheating: three-strike system
  useEffect(() => {
    if (!attemptId || !examId) return;
    let mounted = true;

    function addStrike(reason) {
      if (!mounted) return;
      setStrikes((prev) => {
        const next = prev + 1;
        // log to backend
        try {
          http.post(`/api/proctoring/${encodeURIComponent(attemptId)}/incident`, {
            type: reason,
            strike: next,
            timestamp: new Date().toISOString(),
          }).catch(() => {});
        } catch {}
        // cancel exam on 3 strikes
        if (next >= 3) {
          try {
            http.post(`/api/exams/${encodeURIComponent(examId)}/cancel`, { attempt_id: attemptId }).catch(() => {});
          } catch {}
          navigate('/exam/cancelled');
        }
        return next;
      });
    }

    const handleBlur = () => addStrike('window-blur');
    const handleVisibility = () => {
      try {
        if (document.visibilityState === 'hidden') {
          addStrike('tab-switch');
        }
      } catch {}
    };
    const handleResize = () => {
      try {
        if (window.outerWidth < 300 || window.outerHeight < 300) {
          addStrike('window-minimize');
        }
      } catch {}
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('resize', handleResize);

    return () => {
      mounted = false;
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
    };
  }, [attemptId, examId, navigate]);

  const answeredCount = useMemo(() => {
    if (!questions.length) return 0;
    let count = 0;
    for (const q of questions) {
      const v = answers[q.id];
      if (v != null && String(v).trim() !== '') count += 1;
    }
    return count;
  }, [questions, answers]);

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round((answeredCount / questions.length) * 100);
  }, [answeredCount, questions]);

  function handleAnswer(id, value) {
    setAnswers((s) => ({ ...s, [id]: value }));
  }

  function goPrev() {
    setCurrentIdx((i) => Math.max(0, i - 1));
  }
  function goNext() {
    setCurrentIdx((i) => Math.min(Math.max(0, questions.length - 1), i + 1));
  }

  async function handleSubmit() {
    try {
      setLoading(true);
      const payloadAnswers = questions.map((q) => ({
        question_id: q.originalId,
        type: q.type === 'text' ? 'open' : q.type,
        skill_id: q.skill_id || '',
        answer: answers[q.id] ?? '',
      }));
      const result = await examApi.submit(examId, {
        attempt_id: attemptId,
        answers: payloadAnswers,
      });
      navigate(`/results/baseline?attemptId=${encodeURIComponent(attemptId)}`, { state: { result } });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Submit failed');
    } finally {
      setLoading(false);
    }
  }

  // Camera callbacks
  async function handleCameraReady() {
    setCameraReady(true);
    try {
      await examApi.proctoringStart(attemptId);
      setCameraOk(true);
    } catch (e) {
      setCameraOk(false);
      setCameraError(e?.response?.data?.error || e?.message || 'Failed to activate proctoring');
    }
  }
  function handleCameraError(message) {
    setCameraError(message || 'Camera access failed');
    setCameraReady(false);
    setCameraOk(false);
  }

  if (loading && !attemptId) return <LoadingSpinner label="Initializing baseline exam..." />;

  return (
    <div className="container-safe py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Baseline Exam</h2>
        <div className="flex items-center gap-4">
          <div className="text-xs text-neutral-400">
            Camera: {cameraReady && cameraOk ? 'active' : (cameraError ? 'error' : 'starting...')}
          </div>
          {attemptId && (
            <div className="w-56">
              <CameraPreview onReady={handleCameraReady} onError={handleCameraError} />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/60 text-red-200 p-3">
          {error}
        </div>
      )}
      {cameraError && (
        <div className="rounded-xl border border-yellow-900 bg-yellow-950/60 text-yellow-200 p-3">
          {cameraError}
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-5">
          <motion.div
            key={questions[currentIdx].id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <QuestionCard
              question={questions[currentIdx]}
              value={answers[questions[currentIdx].id] || ''}
              onChange={handleAnswer}
            />
          </motion.div>
          <div className="flex items-center justify-between">
            <div className="min-w-[96px]">
              {currentIdx > 0 && (
                <button
                  className="btn-secondary"
                  onClick={goPrev}
                >
                  Previous
                </button>
              )}
            </div>
            <div className="text-sm text-neutral-300">
              Progress: {progress}% &nbsp; <span className="text-neutral-500">({answeredCount}/{questions.length} answered)</span>
            </div>
            {currentIdx < questions.length - 1 ? (
              <button className="btn-emerald" onClick={goNext} disabled={questionsLoading || !(cameraReady && cameraOk)}>
                Next
              </button>
            ) : (
              <button className="btn-emerald" onClick={handleSubmit} disabled={questionsLoading || !(cameraReady && cameraOk)}>
                Submit
              </button>
            )}
          </div>
        </div>
      )}

      {questions.length === 0 && (cameraError ? (
        <div className="text-sm text-neutral-400">
          Camera access is required to start the exam. Please allow camera access and refresh.
        </div>
      ) : (
        <LoadingSpinner label="Preparing questions..." />
      ))}
    </div>
  );
}


