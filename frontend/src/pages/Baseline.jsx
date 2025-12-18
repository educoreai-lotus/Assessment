import { useEffect, useMemo, useRef, useState } from 'react';
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

  // Gate: redirect to Intro unless accepted for this attempt
  useEffect(() => {
    const acceptedParam = searchParams.get('introAccepted') === 'true';
    const attemptParam = searchParams.get('attemptId');
    const acceptedLocal = attemptParam ? localStorage.getItem(`introAccepted:${attemptParam}`) === 'true' : false;
    if (!acceptedParam && !acceptedLocal) {
      const qp = new URLSearchParams();
      qp.set('examType', 'baseline');
      const examIdQ = searchParams.get('examId');
      const attemptIdQ = searchParams.get('attemptId');
      if (examIdQ) qp.set('examId', examIdQ);
      if (attemptIdQ) qp.set('attemptId', attemptIdQ);
      navigate(`/exam-intro?${qp.toString()}`, { replace: true });
    }
  }, [navigate, searchParams]);

  const initialExamId = useMemo(() => {
    const qp = searchParams.get('examId');
    if (qp) return qp;
    const stored = localStorage.getItem('exam_baseline_id');
    if (stored) return stored;
    return null;
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [stage, setStage] = useState('theory'); // 'theory' | 'coding' | 'submit'
  const [remainingSec, setRemainingSec] = useState(null);
  const [devlabHtml, setDevlabHtml] = useState(null);
  const [examCanceled, setExamCanceled] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');

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

  async function waitForPackage(examId, maxWaitMs = 90000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      try {
        const res = await http.get(`/api/exams/${encodeURIComponent(examId)}`);
        if (res?.data?.package_ready) {
          return res.data;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error('package_not_ready_timeout');
  }

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
          if (apiErr === 'baseline_already_completed') {
            try {
              const attemptsResp = await http.get(`/api/attempts/user/${encodeURIComponent(userId)}`);
              const attempts = attemptsResp?.data || [];
              const baselineAttempt = attempts.find(a => a.exam_type === 'baseline' && a.submitted_at);
              console.log("Baseline existing attempt:", baselineAttempt);
              if (!baselineAttempt) {
                setError('baseline_exists_but_not_found');
                return;
              }
              navigate(`/results/baseline/${encodeURIComponent(baselineAttempt.attempt_id)}`);
              return;
            } catch {
              setError('baseline_exists_but_not_found');
              return;
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

  // Persist acceptance token tied to attempt once known
  useEffect(() => {
    const acceptedParam = searchParams.get('introAccepted') === 'true';
    if (acceptedParam && attemptId) {
      try { localStorage.setItem(`introAccepted:${attemptId}`, 'true'); } catch {}
    }
  }, [attemptId, searchParams]);

  // Start exam only after camera is ready and backend session is active
  useEffect(() => {
    let cancelled = false;
    async function startExamIfReady() {
      if (!examId || !attemptId) return;
      if (!cameraReady || !cameraOk) return;
      try {
        setQuestionsLoading(true);
        try {
          await waitForPackage(examId);
        } catch {
          throw new Error('Exam package not ready yet. Please retry in a moment.');
        }
        const data = await examApi.start(examId, { attempt_id: attemptId });
        if (cancelled) return;
        try {
          const html =
            data?.devlab_ui?.componentHtml ||
            data?.devlabUi?.componentHtml ||
            data?.devlab_ui_html ||
            null;
          setDevlabHtml(typeof html === 'string' && html.trim() !== '' ? html : null);
          // eslint-disable-next-line no-console
          console.log('[EXAM][PACKAGE][DEVLAB_UI]', !!html, typeof html === 'string' ? html.length : 0);
        } catch {}
        // Initialize remaining seconds from expires_at or duration_seconds
        try {
          if (data?.expires_at) {
            const now = Date.now();
            const exp = new Date(String(data.expires_at)).getTime();
            const diff = Math.max(0, Math.floor((exp - now) / 1000));
            setRemainingSec(Number.isFinite(diff) ? diff : null);
          } else if (Number.isFinite(Number(data?.duration_seconds))) {
            setRemainingSec(Number(data.duration_seconds));
          }
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
        setStage('theory');
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

  const currentIndexDisplay = currentIdx + 1;
  const totalQuestions = questions.length;

  function handleAnswer(id, value) {
    setAnswers((s) => ({ ...s, [id]: value }));
  }

  function goPrev() {
    setCurrentIdx((i) => Math.max(0, i - 1));
  }
  function goNext() {
    setCurrentIdx((i) => {
      const next = Math.min(Math.max(0, questions.length - 1), i + 1);
      // Transition to coding after the last theoretical question
      if (next >= questions.length - 1 && i === questions.length - 1) {
        setStage('coding');
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    try {
      // Immediate submit loading UI
      setIsSubmitting(true);
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
      console.log('[UI][SUBMIT][RESP]', result);
      if (result && result.status === 'PENDING_CODING') {
        // Wait for coding grading
        let attempts = 0;
        while (attempts < 60) {
          await new Promise((r) => setTimeout(r, 2000));
          const res = await examApi.attempt(attemptId);
          if (res && res.status === 'PENDING_CODING') {
            attempts += 1;
            continue;
          }
          if (res && res.status === 'CANCELED') {
            navigate('/exam/cancelled', { replace: true, state: { reason: 'phone_detected' } });
            return;
          }
          navigate(`/results/baseline?attemptId=${encodeURIComponent(attemptId)}`, { state: { result: res } });
          return;
        }
        // Fallback after timeout
        navigate(`/results/baseline?attemptId=${encodeURIComponent(attemptId)}`);
        return;
      }
      if (result && result.status === 'CANCELED') {
        navigate('/exam/cancelled', { replace: true, state: { reason: 'phone_detected' } });
        return;
      }
      navigate(`/results/baseline?attemptId=${encodeURIComponent(attemptId)}`, { state: { result } });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Submit failed');
    } finally {
      // Keep isSubmitting true until navigation; if we reach here due to error, allow retry
      setIsSubmitting(false);
    }
  }

  // Countdown timer
  useEffect(() => {
    if (!Number.isFinite(remainingSec) || remainingSec == null) return;
    let cancelled = false;
    const id = setInterval(() => {
      if (cancelled) return;
      setRemainingSec((s) => {
        if (s == null) return s;
        const next = s - 1;
        return next <= 0 ? 0 : next;
      });
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [remainingSec]);

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

  function handlePhoneDetected() {
    setExamCanceled(true);
    setCancelMessage('Exam canceled due to phone detection');
    try {
      setTimeout(() => {
        if (attemptId) {
          navigate(`/results/baseline?attemptId=${encodeURIComponent(attemptId)}`, { replace: true, state: { reason: 'phone_detected' } });
        } else {
          navigate('/exam/cancelled', { replace: true, state: { reason: 'phone_detected' } });
        }
      }, 1500);
    } catch {}
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
          <div className="px-3 py-1 rounded-md bg-emerald-900/50 border border-emerald-700 text-emerald-200 font-mono text-sm">
            {Number.isFinite(remainingSec) && remainingSec != null
              ? new Date(Math.max(0, remainingSec) * 1000).toISOString().substr(11, 8)
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
            <div className="text-sm text-neutral-300">
              Question {currentIndexDisplay} of {totalQuestions} &nbsp;
              <span className="text-neutral-500">(Answered: {answeredCount}/{totalQuestions})</span>
            </div>
            <button className="btn-emerald" onClick={goNext} disabled={questionsLoading || !(cameraReady && cameraOk) || isSubmitting}>
              Next
            </button>
          </div>
        </div>
      )}

      {!examCanceled && questions.length === 0 && (cameraError ? (
        <div className="text-sm text-neutral-400">
          Camera access is required to start the exam. Please allow camera access and refresh.
        </div>
      ) : (
        <LoadingSpinner label="Preparing questions..." />
      ))}

      {/* Coding stage: show only DevLab HTML */}
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

      {/* Submit stage: show final submit button with loading */}
      {!examCanceled && stage === 'submit' && (
        <div className="mt-8 flex items-center justify-center">
          <button className="btn-emerald px-8 py-3 text-lg" onClick={handleSubmit} disabled={isSubmitting || !cameraOk}>
            Submit Exam
          </button>
        </div>
      )}

      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl p-6 w-[320px] text-center">
            <LoadingSpinner label="Submitting exam..." />
          </div>
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


