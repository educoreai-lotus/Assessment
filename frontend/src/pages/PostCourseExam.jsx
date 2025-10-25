import React, { useEffect, useState } from "react";
import { buildPostCourseExam, submitPostCourseExam } from "../api/postCourseApi";

export default function PostCourseExam() {
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

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
    const result = await submitPostCourseExam({ exam_id: exam.exam_id, answers });
    console.log("📊 Evaluation result:", result);
  };

  if (loading) return <p>Loading post-course exam...</p>;
  if (!exam) return <p>Exam not found.</p>;

  return (
    <div>
      <h2>{exam.title}</h2>
      {exam.questions.map((q, i) => (
        <div key={i}>
          <p>{q.question}</p>
          {/* render options here */}
        </div>
      ))}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
