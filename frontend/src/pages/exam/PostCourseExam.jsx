import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import QuestionCard from '../../components/QuestionCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import CameraPreview from '../../components/CameraPreview';
import { examApi } from '../../services/examApi';
import { http } from '../../services/http';

export default function PostCourseExam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialExamId = useMemo(() => {
    const qp = searchParams.get('examId');
    if (qp) return qp;
    const stored = localStorage.getItem('exam_postcourse_id');
    if (stored) return stored;
    return null;
  }, [searchParams]);

  const initialCourseId = useMemo(() => {
    const qp = searchParams.get('courseId') || searchParams.get('course_id');
    if (qp) {
      localStorage.setItem('postcourse_course_id', qp);
      return qp;
    }
    const stored = localStorage.getItem('postcourse_course_id');
    if (stored) return stored;
    const fallback = 'c_555';
    localStorage.setItem('postcourse_course_id', fallback);
    return fallback;
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState('');

  const [examId, setExamId] = useState(initialExamId);
  const [attemptId, setAttemptId] = useState(null);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [bootstrapReady, setBootstrapReady] = useState(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraOk, setCameraOk] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [strikes, setStrikes] = useState(0);
  const proctoringStartedRef = useRef(false);
  const [expiresAtIso, setExpiresAtIso] = useState(null);
  const [remainingSec, setRemainingSec] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        setLoading(true);
        setError('');

        if (!courseId) {
          throw new Error('course_id is required for post-course exam');
        }

        // Resolve demo user id (persist across sessions)
        let userId = localStorage.getItem('demo_user_id');
        if (!userId) {
          userId = 'u_123';
          localStorage.setItem('demo_user_id', userId);
        }

        let resolvedExamId = examId;
        let resolvedAttemptId = null;

        // Create a postcourse exam (idempotent per use-case; attempts policy enforced on start)
        try {
          const created = await examApi.create({
            user_id: userId,
            exam_type: 'postcourse',
            course_id: courseId,
          });
          resolvedExamId = String(created?.exam_id ?? '');
          resolvedAttemptId = created?.attempt_id ?? null;
          if (resolvedExamId) {
            localStorage.setItem('exam_postcourse_id', resolvedExamId);
          }
          if (!resolvedAttemptId) {
            throw new Error('Create response missing attempt_id');
          }
        } catch (err) {
          const apiErr = err?.response?.data?.error || '';
          // Fallback to most recent attempt when policy prevents new attempt
          if (apiErr === 'max_attempts_reached' || apiErr === 'baseline_already_completed') {
            const list = await examApi.attemptsByUser(userId);
            const candidates = Array.isArray(list) ? list.filter(a => a.exam_type === 'postcourse') : [];
            const latest = candidates.find(a => String(a?.exam_id) === String(resolvedExamId)) || candidates[0];
            resolvedExamId = String(latest?.exam_id || resolvedExamId || '');
            resolvedAttemptId = latest?.attempt_id ?? null;
          } else {
            throw err;
          }
        }

        if (!resolvedExamId || !resolvedAttemptId) {
          throw new Error('Unable to resolve post-course exam or attempt.');
        }

        if (!mounted) return;
        setExamId(resolvedExamId);
        setAttemptId(resolvedAttemptId);
        setBootstrapReady(true);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to initialize post-course exam');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [courseId, examId]);

  useEffect(() => {
    let cancelled = false;
    async function startIfReady() {
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
        // Timer fields
        if (data?.expires_at) {
          setExpiresAtIso(String(data.expires_at));
          const now = Date.now();
          const exp = new Date(String(data.expires_at)).getTime();
          const diff = Math.max(0, Math.floor((exp - now) / 1000));
          setRemainingSec(Number.isFinite(diff) ? diff : null);
        } else if (Number.isFinite(Number(data?.duration_seconds))) {
          setRemainingSec(Number(data.duration_seconds));
        }
      } catch (e) {
        const apiErr = e?.response?.data?.message || e?.response?.data?.error || e?.message || '';
        if (apiErr === 'max_attempts_reached') {
          // Try to redirect to the most recent attempt results for this user/course
          try {
            const userId = localStorage.getItem('demo_user_id') || 'u_123';
            const list = await examApi.attemptsByUser(userId);
            const candidates = Array.isArray(list) ? list.filter(a => a.exam_type === 'postcourse') : [];
            // Prefer the last submitted attempt for this exam
            const latest = candidates.find(a => String(a?.exam_id) === String(examId)) || candidates[0];
            if (latest?.attempt_id) {
              navigate(`/results/postcourse/${encodeURIComponent(latest.attempt_id)}`);
              return;
            }
          } catch {}
        }
        setError(apiErr || 'Failed to start post-course exam');
      } finally {
        setQuestionsLoading(false);
      }
    }
    startIfReady();
    return () => { cancelled = false; };
  }, [examId, attemptId, cameraReady, cameraOk, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!Number.isFinite(remainingSec) || remainingSec == null) return;
    let cancelled = false;
    const id = setInterval(() => {
      if (cancelled) return;
      setRemainingSec((s) => {
        if (s == null) return s;
        const next = s - 1;
        if (next <= 0) {
          clearInterval(id);
          // Auto-submit or block
          handleSubmit().catch(() => {});
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [remainingSec]);

  useEffect(() => {
    if (!attemptId || !examId) return;
    let mounted = true;

    function addStrike(reason) {
      if (!mounted) return;
      setStrikes((prev) => {
        const next = prev + 1;
        try {
          http.post(`/api/proctoring/${encodeURIComponent(attemptId)}/incident`, {
            type: reason,
            strike: next,
            timestamp: new Date().toISOString(),
          }).catch(() => {});
        } catch {}
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

  function handleAnswer(id, value) {
    setAnswers((s) => ({ ...s, [id]: value }));
  }

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
      navigate(`/results/postcourse/${encodeURIComponent(attemptId)}`, { state: { result } });
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Submit failed');
    } finally {
      setLoading(false);
    }
  }

  // Camera callbacks
  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);
  const handleCameraError = useCallback((message) => {
    setCameraError(message || 'Camera access failed');
    setCameraReady(false);
    setCameraOk(false);
  }, []);

  // Start proctoring once when all prerequisites are ready
  useEffect(() => {
    if (!attemptId) return;
    if (!cameraReady) return;
    if (!bootstrapReady) return;
    if (proctoringStartedRef.current) return;
    let canceled = false;
    (async () => {
      try {
        await examApi.proctoringStartForExam(examId, { attempt_id: attemptId });
        if (canceled) return;
        proctoringStartedRef.current = true;
        setCameraOk(true);
      } catch (e) {
        if (canceled) return;
        setCameraOk(false);
        setCameraError(e?.response?.data?.error || e?.message || 'Failed to activate proctoring');
      }
    })();
    return () => { canceled = true; };
  }, [attemptId, examId, cameraReady, bootstrapReady]);

  useEffect(() => {
    console.log("🔥 FRONTEND attemptId =", attemptId);
  }, [attemptId]);

  if (loading && !attemptId) return <LoadingSpinner label="Initializing post-course exam..." />;

  return (
    <div className="container-safe py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Post-Course Exam</h2>
        <div className="flex items-center gap-4">
          <div className="text-xs text-neutral-400">
            Camera: {cameraReady && cameraOk ? 'active' : (cameraError ? 'error' : 'starting...')}
          </div>
          <div className="px-3 py-1 rounded-md bg-emerald-900/50 border border-emerald-700 text-emerald-200 font-mono">
            {Number.isFinite(remainingSec) && remainingSec != null
              ? new Date(remainingSec * 1000).toISOString().substr(11, 8)
              : '--:--:--'}
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
