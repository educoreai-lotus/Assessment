import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildPostCourseExam, submitPostCourseExam } from "../api/postCourseApi";
import ExamTimer from "../components/ExamTimer";
import QuestionCard from "../components/QuestionCard";
import ProctorMonitor from "../components/ProctorMonitor";

export default function PostCourseExam() {
  const [exam, setExam] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🚀 Starting post-course exam fetch...");
    const params = new URLSearchParams(window.location.search);
    const ret = params.get('return') || document.referrer || undefined;
    if (ret) localStorage.setItem('returnUrl', ret);
    buildPostCourseExam()
      .then((data) => {
        console.log("✅ Received post-course exam:", data);
        if (data?.return_url) localStorage.setItem('returnUrl', data.return_url);
        setExam(data);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleAnswer(value) {
    const q = exam.questions[index];
    setAnswers({ ...answers, [q.id]: value });
  }

  function next() {
    if (index < exam.questions.length - 1) setIndex(index + 1);
  }

  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  async function finishAndSubmit() {
    const payload = { exam_id: exam.exam_id, answers, questions: exam.questions };
    const result = await submitPostCourseExam(payload);
    navigate('/post-course-results', { state: { result } });
  }

  if (loading) return <p>Loading post-course exam...</p>;
  if (!exam) return <p>Exam not found.</p>;

  return (
    <section className="personalized-dashboard">
      <div className="dashboard-container">
        <h1 className="section-title">Post-Course Exam</h1>
        <ExamTimer minutes={exam.duration_min || 30} />
        <ProctorMonitor />
        <div className="dashboard-grid">
          <QuestionCard
            question={exam.questions[index]}
            index={index}
            total={exam.questions.length}
            selected={answers[exam.questions[index].id]}
            onAnswer={handleAnswer}
          />
        </div>
        <div className="flex justify-between mt-6">
          <button onClick={prev} disabled={index === 0} className="btn btn-secondary disabled:opacity-50">Previous</button>
          <button onClick={index === exam.questions.length - 1 ? finishAndSubmit : next} className="btn btn-primary">
            {index === exam.questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </section>
  );
}
