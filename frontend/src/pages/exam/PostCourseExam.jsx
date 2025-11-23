import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import QuestionCard from '../../components/QuestionCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import CameraPreview from '../../components/CameraPreview';
import { examApi } from '../../services/examApi';
import { http } from '../../services/http';

// Mount guard + instrumentation
// Ensures createExam is called only once per mount
// and helps detect unexpected remounts


async function waitForPackage(examId, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await http.get(`/api/exams/${examId}`);
      if (res?.data?.package_ready) {
        return res.data;
      }
    } catch (err) {
      // Ignore until ready
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error("Exam package still not ready after waiting");
}

export default function PostCourseExam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const creationStarted = useRef(false);
  const mountCountRef = useRef(0);
  const clearedOnceRef = useRef(false);
  const mountedRef = useRef(false);

  // Clear stale attempt id on every fresh visit
  useEffect(() => {
    try {
      localStorage.removeItem("postcourse_attempt_id");
      localStorage.removeItem("postcourse_exam_id");
      localStorage.removeItem("postcourse_answers");
    } catch {}
  }, []);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const recreateOnceRef = useRef(false);
  const answeredCount = useMemo(() =>
    Object.values(answers).filter(v => v !== '' && v != null).length,
  [answers]);
  const totalCount = questions.length;

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      mountCountRef.current += 1;
      console.log("🔥 mount #", mountCountRef.current);
      try {
        setLoading(true);
        setError('');

        if (!courseId) {
          throw new Error('course_id is required for post-course exam');
        }

        // Clear previous attempt only once (fresh entry)
        if (!clearedOnceRef.current) {
          try {
            localStorage.removeItem('postcourse_attempt_id');
            localStorage.removeItem('postcourse_attempt_no');
          } catch {}
          clearedOnceRef.current = true;
        }

        // Guard: ensure we call createExam only once
        if (creationStarted.current) {
          console.log('🔥 createExam skipped (already started)');
          return;
        }
        creationStarted.current = true;

        // Resolve demo user id (persist across sessions)
        let userId = localStorage.getItem('demo_user_id');
        if (!userId) {
          userId = 'u_123';
          localStorage.setItem('demo_user_id', userId);
        }

        let resolvedExamId = null;
        let resolvedAttemptId = null;

        // If any stale stored attempt exists, verify and clear if expired
        try {
          const storedExamId = localStorage.getItem('exam_postcourse_id');
          const storedAttemptId = localStorage.getItem('postcourse_attempt_id');
          if (storedExamId && storedAttemptId) {
            try {
              const status = await examApi.resolve(storedExamId);
              const expired = status?.status === 'expired' || (status?.expires_at && new Date(status.expires_at) < new Date());
              if (expired) {
                console.log('🔥 Clearing expired stored postcourse attempt', storedAttemptId, storedExamId);
                localStorage.removeItem('postcourse_attempt_id');
                localStorage.removeItem('postcourse_attempt_no');
              }
            } catch {
              // If resolve fails, clear stale cache to be safe
              localStorage.removeItem('postcourse_attempt_id');
              localStorage.removeItem('postcourse_attempt_no');
            }
          }
        } catch {}

        // Always request a fresh attempt from backend
        try {
          console.log("🔥 createExam called");
          const created = await examApi.create({
            user_id: userId,
            exam_type: 'postcourse',
            course_id: courseId,
          });
          const { exam_id, attempt_id } = created;
          // store separately for navigation
          try {
            localStorage.setItem("postcourse_exam_id", String(exam_id || ''));
            localStorage.setItem("postcourse_attempt_id", String(attempt_id || ''));
          } catch {}
          setAttemptId(attempt_id);
          setExamId(exam_id);
          console.log("⏳ Waiting for exam package to be ready...");
          await waitForPackage(exam_id);
          console.log("✅ Exam package ready");
          // Always override with fresh IDs from backend
          resolvedExamId = String(created?.exam_id ?? '');
          resolvedAttemptId = created?.attempt_id ?? null;
          console.log('🔥 NEW POSTCOURSE ATTEMPT', resolvedAttemptId, resolvedExamId);
          // Clear any cached/baseline artifacts and reset local exam/proctoring state
          try {
            localStorage.removeItem('exam_baseline_id');
            // Do NOT persist any attempt_id in storage; only exam id for convenience
            if (resolvedExamId) localStorage.setItem('exam_postcourse_id', resolvedExamId);
            if (resolvedAttemptId) localStorage.setItem('postcourse_attempt_id', String(resolvedAttemptId));
            if (created?.attempt_no != null) localStorage.setItem('postcourse_attempt_no', String(created.attempt_no));
          } catch {}
          // Reset UI and gating state to avoid reusing stale attempt info
          proctoringStartedRef.current = false;
          setCameraReady(false);
          setCameraOk(false);
          setCameraError('');
          setQuestions([]);
          setAnswers({});
          setCurrentIdx(0);
          setExpiresAtIso(null);
          setRemainingSec(null);
          setStrikes(0);
          if (!resolvedAttemptId) {
            throw new Error('Create response missing attempt_id');
          }
        } catch (err) {
          const apiErr = err?.response?.data?.error || '';
          const statusCode = err?.response?.status;
          if (apiErr === 'already_passed') {
            // Redirect to latest submitted attempt
            try {
              const list = await examApi.attemptsByUser(userId);
              const submitted = Array.isArray(list) ? list.filter(a => !!a.submitted_at && a.exam_type === 'postcourse') : [];
              const latest = submitted[0] || list[0];
              if (latest?.attempt_id) {
                navigate(`/results/postcourse/${encodeURIComponent(latest.attempt_id)}`, { state: { notice: 'You already passed' } });
                return;
              }
            } catch {}
            throw err;
          }
          if (apiErr === 'max_attempts_reached') {
            // Redirect to last submitted attempt with notice
            try {
              const list = await examApi.attemptsByUser(userId);
              const submitted = Array.isArray(list) ? list.filter(a => !!a.submitted_at && a.exam_type === 'postcourse') : [];
              const latest = submitted[0] || list[0];
              if (latest?.attempt_id) {
                navigate(`/results/postcourse/${encodeURIComponent(latest.attempt_id)}`, { state: { notice: 'You have used all attempts' } });
                return;
              }
            } catch {}
            throw err;
          }
          if (statusCode === 403 || apiErr === 'exam_time_expired' || apiErr === 'proctoring_not_started') {
            // Clear stale attempt if any 403 at creation
            try {
              localStorage.removeItem('postcourse_attempt_id');
              localStorage.removeItem('postcourse_attempt_no');
            } catch {}
          }
          // Fallback to most recent attempt when policy prevents new attempt
          if (apiErr === 'baseline_already_completed') {
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
  }, [courseId]);

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
        try { localStorage.setItem("postcourse_answers", JSON.stringify({})); } catch {}
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

  // Navigation-based counter
  const currentIndexDisplay = currentIdx + 1;

  function goPrev() {
    setCurrentIdx((i) => Math.max(0, i - 1));
  }
  function goNext() {
    setCurrentIdx((i) => Math.min(Math.max(0, questions.length - 1), i + 1));
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    try {
      console.trace('[UI][SUBMIT][START]');
      setIsSubmitting(true);
      setLoading(true);
      // Only send answers for questions in current attempt's package
      const filteredAnswers = Object.entries(answers)
        .filter(([questionId]) => questions.find((q) => String(q.originalId || q.id) === String(questionId)))
        .map(([question_id, answer]) => ({ question_id, answer }));
      const result = await examApi.submit(examId, {
        attempt_id: attemptId,
        answers: filteredAnswers,
      });
      console.trace('[UI][SUBMIT][DONE]');
      navigate(`/results/postcourse/${encodeURIComponent(attemptId)}`, { state: { result } });
    } catch (e) {
      console.trace('[UI][SUBMIT][ERROR] Error:', e?.message || e);
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Submit failed');
    } finally {
      setIsSubmitting(false);
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
          <div className="text-sm text-neutral-300">
            {answeredCount}/{totalCount} answered
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
            <div className="text-gray-400 text-sm">
              Question {currentIndexDisplay} of {questions.length}
            </div>
            {currentIdx < questions.length - 1 ? (
              <button className="btn-emerald" onClick={goNext} disabled={questionsLoading || !(cameraReady && cameraOk) || isSubmitting}>
                Next
              </button>
            ) : (
              <button className="btn-emerald" onClick={handleSubmit} disabled={questionsLoading || !(cameraReady && cameraOk) || isSubmitting}>
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

      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl p-6 w-[320px] text-center">
            <LoadingSpinner label="Submitting exam..." />
          </div>
        </div>
      )}
    </div>
  );
}
