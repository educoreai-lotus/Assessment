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
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');

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

        // Start exam with required attempt_id
        const data = await examApi.start(resolvedExamId, { attempt_id: attemptId });
        if (!mounted) return;
        const normalized = Array.isArray(data?.questions)
          ? data.questions.map((p, idx) => ({
              id: p?.question_id || p?.qid || p?.id || String(idx + 1),
              type: (p?.metadata?.type || p?.type || 'mcq') === 'open' ? 'text' : (p?.metadata?.type || p?.type || 'mcq'),
              prompt: p?.question || p?.stem || p?.prompt || '',
              options: Array.isArray(p?.options) ? p.options : (Array.isArray(p?.choices) ? p.choices : []),
              skill: p?.skill_name || p?.skill || p?.skill_id || 'General',
            }))
          : [];
        setQuestions(normalized);
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

  async function handleSubmit() {
    try {
      setLoading(true);
      await examApi.submit(examId, { exam_type: 'baseline', answers });
      alert('Submitted! Check results.');
    } catch (e) {
      setError(e?.message || 'Submit failed');
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
      <div className="space-y-5">
        {questions.map((q) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <QuestionCard question={q} onAnswer={handleAnswer} />
          </motion.div>
        ))}
      </div>
      <div className="flex justify-end">
        <button className="btn-emerald" onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  );
}


