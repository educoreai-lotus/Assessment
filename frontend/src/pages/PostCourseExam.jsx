import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildPostCourseExam } from "../api/postCourseApi";
import { submitPostCourseExam } from "../api/postCourseEvalApi";
import ExamTimer from "../components/ExamTimer";
import QuestionCard from "../components/QuestionCard";
import ProctorMonitor from "../components/ProctorMonitor";

export default function PostCourseExam() {
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    buildPostCourseExam("demo-course")
      .then(setExam)
      .catch((err) => setError(err));
  }, []);

  const [error, setError] = useState(null);
  if (error) {
    if (error?.error === 'ATTEMPT_LIMIT_REACHED') {
      return (
        <div className="p-6 max-w-xl mx-auto dashboard-card">
          <h2 className="font-semibold mb-2">Attempt Limit Reached</h2>
          <p className="mb-2">You’ve reached the maximum attempts. Contact support to request an override.</p>
        </div>
      );
    }
    if (error?.error === 'COOLDOWN_ACTIVE') {
      return (
        <div className="p-6 max-w-xl mx-auto dashboard-card">
          <h2 className="font-semibold mb-2">Cooldown Active</h2>
          <p className="mb-2">You can try again after: {error?.data?.until}</p>
        </div>
      );
    }
    return <p className="p-6">{error?.message || 'Unable to load exam.'}</p>;
  }

  if (!exam) return <p className="p-6">Loading exam...</p>;

  async function handleSubmit() {
    const payload = { answers, questions: exam.questions };
    const res = await submitPostCourseExam(payload);
    navigate('/post-course-results', { state: { result: res } });
  }

  return (
    <section className="personalized-dashboard">
      <div className="dashboard-container">
        <h1 className="section-title">Post-Course Exam</h1>
        <ExamTimer minutes={exam.duration_min} />
        <ProctorMonitor />
        <div className="dashboard-grid">
          {exam.questions.map((q, i) => (
            <div key={q.id}>
              <QuestionCard
                question={q}
                index={i}
                total={exam.questions.length}
                selected={answers[q.id]}
                onAnswer={(a) => setAnswers({ ...answers, [q.id]: a })}
              />
            </div>
          ))}
        </div>
        <div className="text-center" style={{ marginTop: 'var(--spacing-xl)' }}>
          <button onClick={handleSubmit} className="btn btn-primary">
            Submit Exam
          </button>
        </div>
      </div>
    </section>
  );
}


