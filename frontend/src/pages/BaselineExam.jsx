import React, { useEffect, useState } from "react";
import { submitBaselineExam, buildBaselineExam } from "../api/evaluationApi";
import BaselineResults from "./BaselineResults";
import QuestionCard from "../components/QuestionCard";
import ExamTimer from "../components/ExamTimer";
import ProctorMonitor from "../components/ProctorMonitor";

export default function BaselineExam() {
  const [exam, setExam] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function loadExam() {
      try {
        const data = await buildBaselineExam();
        console.log('✅ Received exam data:', data);
        setExam(data);
      } catch (e) {
        console.error(e);
      }
    }
    loadExam();
  }, []);

  if (!exam) return <div className="p-6 text-center">Loading baseline exam...</div>;

  const question = exam.questions[index];
  const total = exam.questions.length;

  function handleAnswer(value) {
    setAnswers({ ...answers, [question.id]: value });
  }

  function next() {
    if (index < total - 1) setIndex(index + 1);
    else setFinished(true);
  }

  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  async function finishAndSubmit() {
    try {
      const payload = await submitBaselineExam({
        userId: 'demo-user',
        answers,
        questions: exam.questions,
        passingGrade: exam.passing_grade || 70,
      });
      setResult(payload);
      setFinished(true);
    } catch (e) {
      console.error(e);
      setFinished(true);
    }
  }

  if (finished) {
    return <BaselineResults result={result} />;
  }

  return (
    <section className="personalized-dashboard">
      <div className="dashboard-container">
        <h1 className="section-title">Baseline Exam</h1>
        <ExamTimer minutes={exam.duration_min} />
        <ProctorMonitor />
        <div className="dashboard-grid">
          <QuestionCard
            question={question}
            index={index}
            total={total}
            selected={answers[question.id]}
            onAnswer={handleAnswer}
          />
        </div>
        <div className="flex justify-between mt-6">
          <button
            onClick={prev}
            disabled={index === 0}
            className="btn btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={index === total - 1 ? finishAndSubmit : next}
            className="btn btn-primary"
          >
            {index === total - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}


