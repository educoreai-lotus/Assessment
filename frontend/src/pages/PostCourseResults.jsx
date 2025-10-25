import React from "react";
import { useLocation } from "react-router-dom";

export default function PostCourseResults() {
  const { state } = useLocation();
  const result = state?.result;
  if (!result) return <p className="p-6">No results yet.</p>;
  return (
    <section className="personalized-dashboard">
      <div className="dashboard-container">
        <h1 className="section-title">Post-Course Evaluation Results</h1>
        {result?.version != null && (
          <p className="text-sm mb-2">Attempt Version: {result.version}</p>
        )}
        <div className="dashboard-card" style={{ textAlign: 'left' }}>
          <p className="text-lg font-semibold">Final Grade: {result.final_grade}</p>
          <p className="mt-2">Status: {result.summary}</p>
        </div>
        <ul className="mt-4">
          {result.ai_feedback.map((f, i) => (
            <li key={i} className="py-2">
              <strong>{f.skill}</strong> ({f.topic}) — {f.score}%
              <span className="ml-2">{f.passed ? "✅" : "❌"}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}


