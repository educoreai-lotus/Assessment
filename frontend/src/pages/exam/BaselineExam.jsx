import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import QuestionCard from '../../components/QuestionCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { examApi } from '../../services/examApi';

export default function BaselineExam() {
  const [searchParams] = useSearchParams();
  const examId = useMemo(() => {
    const qp = searchParams.get('examId');
    if (qp) return qp;
    const stored = localStorage.getItem('exam_baseline_id');
    if (stored) return stored;
    const generated = '1001';
    localStorage.setItem('exam_baseline_id', generated);
    return generated;
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    examApi
      .start(examId, { exam_type: 'baseline' })
      .then((data) => {
        if (!mounted) return;
        setQuestions(data?.questions || []);
      })
      .catch((e) => setError(e?.message || 'Failed to load exam'))
      .finally(() => setLoading(false));
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


