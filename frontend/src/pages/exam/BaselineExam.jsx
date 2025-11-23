import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QuestionCard from '../../components/QuestionCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { examApi } from '../../services/examApi';
import { http } from '../../services/http';
import CameraPreview from '../../components/CameraPreview';

export default function BaselineExam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const examId = useMemo(() => {
    const qp = searchParams.get('examId');
    if (qp) return qp;
    const stored = localStorage.getItem('exam_baseline_id');
    if (stored) return stored;
    return null;
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [cameraOk, setCameraOk] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const [mediaError, setMediaError] = useState('');
  const [starting, setStarting] = useState(true);
  const [startingCamera, setStartingCamera] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const liveStreamRef = useRef(null);
  const [expiresAtIso, setExpiresAtIso] = useState(null);
  const [remainingSec, setRemainingSec] = useState(null);
  const answeredCount = useMemo(() =>
    Object.values(answers).filter(v => v !== '' && v != null).length,
  [answers]);
  const totalCount = questions.length;

  useEffect(() => {
    let mounted = true;
    let currentStream = null;

    async function ensureCamera(streamAttemptId) {
      // Request camera and attach to preview
      try {
        setStartingCamera(true);
        setMediaError('');
        // Real browser camera request
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!mounted) {
          // Immediately stop tracks if we already unmounted
          try {
            stream.getTracks().forEach((t) => t.stop());
          } catch {}
          return false;
        }
        liveStreamRef.current = stream;
        // Notify backend after acquiring local camera stream
        await examApi.proctoringStart(streamAttemptId);
        if (!mounted) return false;
        setCameraOk(true);
        return true;
      } catch (e) {
        const msg =
          e?.name === 'NotAllowedError'
            ? 'Camera permission denied'
            : e?.message || 'Failed to start camera';
        setMediaError(msg);
        setCameraOk(false);
        return false;
      } finally {
        setStartingCamera(false);
      }
    }

    async function bootstrapBaseline() {
      try {
        setLoading(true);
        setError('');

        // Resolve demo user id (persist to keep baseline uniqueness)
        let userId = localStorage.getItem('demo_user_id');
        if (!userId) {
          userId = 'u_123';
          localStorage.setItem('demo_user_id', userId);
        }

        // Ensure we have an exam_id and attempt_id
        let resolvedExamId = examId;
        let attemptId = null;

        // Always (idempotently) create baseline; fall back to existing if already created
        try {
          const created = await examApi.create({ user_id: userId, exam_type: 'baseline' });
          resolvedExamId = String(created?.exam_id ?? '');
          attemptId = created?.attempt_id ?? null;
          if (resolvedExamId) {
            localStorage.setItem('exam_baseline_id', resolvedExamId);
          }
        } catch (err) {
          const apiErr = err?.response?.data?.error || '';
          // If baseline already exists for this user, redirect to last submitted baseline result
          if (apiErr === 'baseline_already_completed') {
            try {
              const list = await http.get(`/api/attempts/user/${encodeURIComponent(userId)}`).then(r => r.data);
              const baseline = Array.isArray(list)
                ? list.find(a => a.exam_type === 'baseline' && a.submitted_at)
                : null;
              console.log("Baseline fallback attempt:", baseline);
              if (baseline && baseline.attempt_id) {
                navigate(`/results/baseline/${encodeURIComponent(baseline.attempt_id)}`);
                return;
              }
              setError('Baseline attempt exists but could not be loaded.');
              return;
            } catch {
              setError('Baseline attempt exists but could not be loaded.');
              return;
            }
          } else {
            throw err;
          }
        }

        // If attemptId still unknown after create (and not baseline_already_completed fallback), stop and report
        if (!resolvedExamId || !attemptId) {
          console.error('Exam creation returned no attempt_id');
          setError('Exam creation failed. Please try again.');
          return;
        }

        // Enforce camera before starting the exam
        const cameraOkLocal = await ensureCamera(attemptId);
        if (!cameraOkLocal) {
          throw new Error('Camera activation required to start exam');
        }

        // Start exam (requires camera active on backend)
        setQuestionsLoading(true);
        const data = await examApi.start(resolvedExamId, { attempt_id: attemptId });
        if (!mounted) return;
        // Normalize question shape for UI, preserve meta for submit payload
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
        setAttemptId(attemptId);
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
        if (!mounted) return;
        setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to load exam');
      } finally {
        if (mounted) {
          setLoading(false);
          setStarting(false);
          setQuestionsLoading(false);
        }
      }
    }

    bootstrapBaseline();
    return () => {
      mounted = false;
      try {
        if (liveStreamRef.current) {
          liveStreamRef.current.getTracks().forEach((t) => t.stop());
          liveStreamRef.current = null;
        }
      } catch {}
    };
  }, [examId]);

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
    if (isSubmitting) return;
    try {
      console.trace('[UI][SUBMIT][START]');
      setIsSubmitting(true);
      const payloadAnswers = questions.map((q) => ({
        question_id: q.originalId,
        type: q.type === 'text' ? 'open' : q.type,
        skill_id: q.skill_id || '',
        answer: answers[q.id] ?? '',
      }));
      const exam_id = localStorage.getItem('exam_baseline_id') || examId;
      const result = await examApi.submit(exam_id, {
        attempt_id: attemptId,
        answers: payloadAnswers,
      });
      console.trace('[UI][SUBMIT][DONE]');
      navigate(`/results/baseline/${encodeURIComponent(attemptId)}`, {
        state: { result },
      });
    } catch (e) {
      console.trace('[UI][SUBMIT][ERROR]', e);
      setError(
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Submit failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading && starting) return <LoadingSpinner label="Loading baseline exam..." />;

  return (
    <div className="container-safe py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Baseline Exam</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-neutral-300">
            {answeredCount}/{totalCount} answered
          </div>
          <div className="px-3 py-1 rounded-md bg-emerald-900/50 border border-emerald-700 text-emerald-200 font-mono">
            {Number.isFinite(remainingSec) && remainingSec != null
              ? new Date(remainingSec * 1000).toISOString().substr(11, 8)
              : '--:--:--'}
          </div>
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/60 text-red-200 p-3">
          {error}
        </div>
      )}
      {mediaError && (
        <div className="rounded-xl border border-yellow-900 bg-yellow-950/60 text-yellow-200 p-3">
          {mediaError}
        </div>
      )}
      <div className="text-xs text-neutral-400">
        Camera: {cameraOk ? 'active' : (startingCamera ? 'starting...' : 'inactive')}
      </div>

      {/* Camera preview */}
      <div className="w-full flex justify-center">
        <CameraPreview stream={liveStreamRef.current} />
      </div>

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
            <div className="text-sm text-neutral-400">
              Question {currentIdx + 1} of {questions.length}
            </div>
            {currentIdx < questions.length - 1 ? (
              <button className="btn-emerald" onClick={goNext} disabled={questionsLoading || isSubmitting}>
                Next
              </button>
            ) : (
              <button className="btn-emerald" onClick={handleSubmit} disabled={questionsLoading || !cameraOk || isSubmitting}>
                Submit
              </button>
            )}
          </div>
        </div>
      )}

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


