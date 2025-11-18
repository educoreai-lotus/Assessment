import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QuestionCard from '../../components/QuestionCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { examApi } from '../../services/examApi';

export default function PostCourseExam() {
  const [searchParams] = useSearchParams();
  const examId = useMemo(() => {
    const qp = searchParams.get('examId');
    if (qp) return qp;
    const stored = localStorage.getItem('exam_postcourse_id');
    if (stored) return stored;
    const generated = '2001';
    localStorage.setItem('exam_postcourse_id', generated);
    return generated;
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ course_id: '', coverage_map: {}, attempts: 0 });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    examApi
      .start(examId, { exam_type: 'postcourse' })
      .then((data) => {
        if (!mounted) return;
        setMeta({
          course_id: data?.course_id || '',
          coverage_map: data?.coverage_map || {},
          attempts: data?.attempt || 1,
        });
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
      await examApi.submit(examId, { exam_type: 'postcourse', answers });
      alert('Submitted! Check results.');
    } catch (e) {
      setError(e?.message || 'Submit failed');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading post-course exam..." />;

  return (
    <div className="container-safe py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Post-Course Exam</h2>
        <div className="text-sm text-neutral-300">Progress: {progress}%</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-neutral-400 mb-1">Course</div>
          <div className="font-medium">{meta.course_id || '—'}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-neutral-400 mb-1">Attempt</div>
          <div className="font-medium">{meta.attempts}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-neutral-400 mb-1">Coverage</div>
          <div className="font-medium text-emeraldbrand-300">
            {Object.keys(meta.coverage_map || {}).length} skills
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/60 text-red-200 p-3">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {questions.map((q) => (
          <QuestionCard key={q.id} question={q} onAnswer={handleAnswer} />
        ))}
      </div>

      <div className="flex justify-end">
        <button className="btn-emerald" onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  );
}


