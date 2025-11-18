import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import QuestionCard from '../../components/QuestionCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { examApi } from '../../services/examApi';
import { http } from '../../services/http';

export default function BaselineExam() {
  const [searchParams] = useSearchParams();
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

  useEffect(() => {
    let mounted = true;
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
          // If baseline already exists for this user, fetch latest baseline attempt
          if (apiErr === 'baseline_already_exists') {
            const list = await http.get(`/api/attempts/user/${encodeURIComponent(userId)}`).then(r => r.data);
            const baseline = Array.isArray(list) ? list.find(a => a.exam_type === 'baseline') : null;
            if (baseline) {
              resolvedExamId = String(baseline.exam_id);
              attemptId = baseline.attempt_id;
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

        // If attemptId still unknown, try to derive from attempts list
        if (!attemptId) {
          const list = await http.get(`/api/attempts/user/${encodeURIComponent(localStorage.getItem('demo_user_id') || 'u_123')}`).then(r => r.data);
          const baseline = Array.isArray(list) ? list.find(a => String(a?.exam_id) === String(resolvedExamId)) : null;
          attemptId = baseline?.attempt_id ?? null;
        }

        if (!resolvedExamId || !attemptId) {
          throw new Error('Unable to resolve exam or attempt. Please try again.');
        }

        // Start camera before starting the exam
        await http.post(`/api/proctoring/${encodeURIComponent(attemptId)}/start_camera`);
        setCameraOk(true);

        // Start exam with required attempt_id
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
              const opts = Array.isArray(p?.options) ? p.options : (Array.isArray(p?.prompt?.choices) ? p.prompt.choices : []);
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
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.error || e?.message || 'Failed to load exam');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrapBaseline();
    return () => {
      mounted = false;
    };
  }, [examId]);

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    const answered = Object.keys(answers).length;
    return Math.round((answered / questions.length) * 100);
  }, [answers, questions]);

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
      await examApi.submit(localStorage.getItem('exam_baseline_id') || examId, {
        attempt_id: attemptId,
        answers: payloadAnswers,
      });
      alert('Submitted! Check results.');
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Submit failed');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading baseline exam..." />;

  return (
    <div className="container-safe py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Baseline Exam</h2>
        <div className="text-sm text-neutral-300">Progress: {progress}%</div>
      </div>
      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/60 text-red-200 p-3">
          {error}
        </div>
      )}
      <div className="text-xs text-neutral-400">
        Camera: {cameraOk ? 'active' : 'starting...'}
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
            <button
              className="btn-secondary"
              onClick={goPrev}
              disabled={currentIdx === 0}
            >
              Previous
            </button>
            <div className="text-sm text-neutral-400">
              {currentIdx + 1} / {questions.length}
            </div>
            {currentIdx < questions.length - 1 ? (
              <button className="btn-emerald" onClick={goNext}>
                Next
              </button>
            ) : (
              <button className="btn-emerald" onClick={handleSubmit}>
                Submit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


