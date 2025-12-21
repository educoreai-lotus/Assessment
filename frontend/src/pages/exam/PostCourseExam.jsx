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


async function waitForPackage(examId, maxWaitMs = 60000) {
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

  // Gate: redirect to Intro unless accepted for this attempt
  useEffect(() => {
    const acceptedParam = searchParams.get('introAccepted') === 'true';
    const attemptParam = searchParams.get('attemptId');
    const acceptedLocal = attemptParam ? localStorage.getItem(`introAccepted:${attemptParam}`) === 'true' : false;
    if (!acceptedParam && !acceptedLocal) {
      const qp = new URLSearchParams();
      qp.set('examType', 'postcourse');
      const examIdQ = searchParams.get('examId');
      const attemptIdQ = searchParams.get('attemptId');
      const courseIdQ = searchParams.get('courseId') || searchParams.get('course_id');
      const courseNameQ = searchParams.get('courseName') || searchParams.get('course_name');
      if (examIdQ) qp.set('examId', examIdQ);
      if (attemptIdQ) qp.set('attemptId', attemptIdQ);
      if (courseIdQ) qp.set('courseId', courseIdQ);
      if (courseNameQ) qp.set('courseName', courseNameQ);
      navigate(`/exam-intro?${qp.toString()}`, { replace: true });
    }
  }, [navigate, searchParams]);

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

  // No course context for postcourse; strictly use IDs from URL

  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [examId, setExamId] = useState(initialExamId);
  const [attemptId, setAttemptId] = useState(searchParams.get('attemptId') || null);
  const [bootstrapReady, setBootstrapReady] = useState(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraOk, setCameraOk] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [strikes, setStrikes] = useState(0);
  const [examCanceled, setExamCanceled] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');
  const proctoringStartedRef = useRef(false);
  const [expiresAtIso, setExpiresAtIso] = useState(null);
  const [remainingSec, setRemainingSec] = useState(null);
  const recreateOnceRef = useRef(false);
  // DevLab iframe runs self-contained via srcDoc; no JS bridge
  const [stage, setStage] = useState('theory'); // 'theory' | 'coding' | 'submit'
  const [devlabHtml, setDevlabHtml] = useState(null);
  const answeredCount = useMemo(() =>
    Object.values(answers).filter(v => v !== '' && v != null).length,
  [answers]);
  const totalCount = questions.length;

  // DevLab grading ingestion (iframe-safe postMessage)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event?.data?.type !== 'assessmentSolutionsSubmitted') return;
      const { evaluation, questions, solutions } = event.data || {};
      const score = (evaluation && typeof evaluation.score === 'number') ? evaluation.score : 0;
      const skillsFeedback = (evaluation && typeof evaluation.skills === 'object' && evaluation.skills) ? evaluation.skills : {};
      try {
        // eslint-disable-next-line no-console
        console.log('[DEVLAB][GRADE][RECEIVED]', { score, skillsFeedback });
      } catch {}
      try {
        http.post('/api/exams/submit-coding-grade', {
          exam_id: examId,
          attempt_id: attemptId,
          score,
          skillsFeedback,
          questions,
          solutions,
        }).catch(() => {});
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [examId, attemptId]);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      mountCountRef.current += 1;
      try {
        setLoading(true);
        setError('');
        const eid = searchParams.get('examId') || null;
        const aid = searchParams.get('attemptId') || null;
        if (!eid || !aid) {
          navigate('/exam-intro?examType=postcourse', { replace: true });
          return;
        }
        setExamId(String(eid));
        setAttemptId(String(aid));
        // Optionally wait until package is ready to reduce start errors
        try { await waitForPackage(String(eid)); } catch {}
        if (!mounted) return;
        // Reset any local UI artifacts
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
        setBootstrapReady(true);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to initialize post-course exam');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    bootstrap();
    return () => { mounted = false; };
  }, [navigate, searchParams]);

  // Persist acceptance token tied to attempt once known
  useEffect(() => {
    const acceptedParam = searchParams.get('introAccepted') === 'true';
    if (acceptedParam && attemptId) {
      try { localStorage.setItem(`introAccepted:${attemptId}`, 'true'); } catch {}
    }
  }, [attemptId, searchParams]);

  // Debug: log camera readiness changes
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[POSTCOURSE][CAMERA][READY_STATE]', { cameraReady });
  }, [cameraReady]);

  useEffect(() => {
    let cancelled = false;
    async function startIfReady() {
      if (!examId || !attemptId) return;
      if (!cameraReady || !cameraOk) return;
      try {
        setQuestionsLoading(true);
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][EXAM][START][CALLING]', { examId, attemptId });
        const data = await examApi.start(examId, { attempt_id: attemptId });
        if (cancelled) return;
        setStage('theory');
        try {
          const html =
            data?.devlab_ui?.componentHtml ||
            data?.devlabUi?.componentHtml ||
            data?.devlab_ui_html ||
            null;
          const htmlStr = typeof html === 'string' && html.trim() !== '' ? html : null;
          setDevlabHtml(htmlStr);
          // eslint-disable-next-line no-console
          console.log('[EXAM][PACKAGE][DEVLAB_UI]', !!html, typeof html === 'string' ? html.length : 0);
        } catch {}
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

  // DevLab answers bridge removed; DevLab graded asynchronously server-side

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
    setCurrentIdx((i) => {
      const next = Math.min(Math.max(0, questions.length - 1), i + 1);
      if (next >= questions.length - 1 && i === questions.length - 1) {
        setStage('coding');
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    try {
      console.trace('[UI][SUBMIT][START]');
      setIsSubmitting(true);
      // Only send answers for questions in current attempt's package with metadata
      const filteredAnswers = Object.entries(answers)
        .filter(([questionId]) => questions.find((q) => String(q.originalId || q.id) === String(questionId)))
        .map(([question_id, answer]) => {
          const qMeta = questions.find((q) => String(q.originalId || q.id) === String(question_id));
          const type = qMeta ? (qMeta.type === 'text' ? 'open' : qMeta.type) : undefined;
          return { question_id, type, skill_id: qMeta?.skill_id || '', answer };
        });
      const result = await examApi.submit(examId, {
        attempt_id: attemptId,
        answers: filteredAnswers,
      });
      console.trace('[UI][SUBMIT][DONE]');
      console.log('[UI][SUBMIT][RESP]', result);
      if (result && result.status === 'PENDING_CODING') {
        // Wait for coding grading to complete
        let tries = 0;
        while (tries < 60) {
          await new Promise((r) => setTimeout(r, 2000));
          const res = await examApi.attempt(attemptId);
          if (res && res.status === 'PENDING_CODING') {
            tries += 1;
            continue;
          }
          if (res && res.status === 'CANCELED') {
            navigate('/exam/cancelled', { replace: true, state: { message: 'Exam canceled due to phone detection' } });
            return;
          }
          navigate(`/results/postcourse/${encodeURIComponent(attemptId)}`, { state: { result: res } });
          return;
        }
        navigate(`/results/postcourse/${encodeURIComponent(attemptId)}`);
        return;
      }
      if (result && result.status === 'CANCELED') {
        navigate('/exam/cancelled', { replace: true, state: { message: 'Exam canceled due to phone detection' } });
        return;
      }
      navigate(`/results/postcourse/${encodeURIComponent(attemptId)}`, { state: { result } });
    } catch (e) {
      console.trace('[UI][SUBMIT][ERROR] Error:', e?.message || e);
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Submit failed');
    } finally {
      setIsSubmitting(false);
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
  const handlePhoneDetected = useCallback(() => {
    setExamCanceled(true);
    setCancelMessage('Exam canceled due to phone detection');
    try {
      setTimeout(() => {
        if (attemptId) {
          navigate(`/results/postcourse/${encodeURIComponent(attemptId)}`, { replace: true, state: { message: 'Exam canceled due to phone detection' } });
        } else {
          navigate('/exam/cancelled', { replace: true, state: { message: 'Exam canceled due to phone detection' } });
        }
      }, 1500);
    } catch {}
  }, [attemptId, navigate]);

  // Start proctoring once when all prerequisites are ready
  useEffect(() => {
    if (!attemptId) return;
    if (!cameraReady) return;
    if (proctoringStartedRef.current) return;
    let canceled = false;
    (async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][PROCTORING][START][CALLING]', { examId, attemptId, cameraReady });
        await examApi.proctoringStartForExam(examId, { attempt_id: attemptId });
        if (canceled) return;
        proctoringStartedRef.current = true;
        setCameraOk(true);
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][PROCTORING][START][OK]', { examId, attemptId });
      } catch (e) {
        if (canceled) return;
        setCameraOk(false);
        setCameraError(e?.response?.data?.error || e?.message || 'Failed to activate proctoring');
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][PROCTORING][START][ERROR]', e?.response?.data?.error || e?.message || e);
      }
    })();
    return () => { canceled = true; };
  }, [attemptId, examId, cameraReady]);

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
          {stage === 'theory' && (
            <div className="text-sm text-neutral-300">
              {answeredCount}/{totalCount} answered
            </div>
          )}
          <div className="px-3 py-1 rounded-md bg-emerald-900/50 border border-emerald-700 text-emerald-200 font-mono">
            {Number.isFinite(remainingSec) && remainingSec != null
              ? new Date(remainingSec * 1000).toISOString().substr(11, 8)
              : '--:--:--'}
          </div>
          {attemptId && (
            <div className="w-56">
              <CameraPreview onReady={handleCameraReady} onError={handleCameraError} attemptId={attemptId} onPhoneDetected={handlePhoneDetected} />
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

      {!examCanceled && questions.length > 0 && stage === 'theory' && (
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
            <button className="btn-emerald" onClick={goNext} disabled={questionsLoading || !(cameraReady && cameraOk) || isSubmitting}>
              Next
            </button>
          </div>
        </div>
      )}

      {!examCanceled && questions.length === 0 && stage !== 'coding' && (cameraError ? (
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

      {!examCanceled && stage === 'coding' && typeof devlabHtml === 'string' && devlabHtml.trim() !== '' && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Coding</h3>
          <iframe
            title="Coding Widget"
            srcDoc={devlabHtml}
            style={{ width: '100%', height: '700px', border: '0', borderRadius: '12px' }}
            sandbox="allow-scripts allow-forms allow-same-origin"
          />
          <div className="mt-4 flex justify-end">
            <button className="btn-emerald" onClick={() => setStage('submit')} disabled={isSubmitting}>
              Proceed to Submit
            </button>
          </div>
        </div>
      )}

      {!examCanceled && stage === 'submit' && (
        <div className="mt-8 flex items-center justify-center">
          <button className="btn-emerald px-8 py-3 text-lg" onClick={handleSubmit} disabled={isSubmitting || !cameraOk}>
            Submit Exam
          </button>
        </div>
      )}

      {examCanceled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-6 w-[360px] text-center text-red-100">
            <div className="text-lg font-semibold mb-2">Exam canceled</div>
            <div className="text-sm">{cancelMessage || 'Exam canceled due to policy violation'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
