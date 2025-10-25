import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildPostCourseExam, submitPostCourseExam } from "../api/postCourseApi";

export default function PostCourseExam() {
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🚀 Starting post-course exam fetch...");
    buildPostCourseExam()
      .then((data) => {
        console.log("✅ Received post-course exam:", data);
        setExam(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    const payload = { exam_id: exam.exam_id, answers, questions: exam.questions };
    const result = await submitPostCourseExam(payload);
    console.log("📊 Evaluation result:", result);
    navigate('/post-course-results', { state: { result } });
  };

  if (loading) return <p>Loading post-course exam...</p>;
  if (!exam) return <p>Exam not found.</p>;

  return (
    <div>
      <h2>{exam.title}</h2>
      {exam.questions.map((q, i) => (
        <div key={i} style={{ marginBottom: '1rem' }}>
          <p>{q.question}</p>
          <input
            type="text"
            placeholder="Your answer"
            value={answers[q.id] || ''}
            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
          />
        </div>
      ))}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
