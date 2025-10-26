import React from "react";
import { useLocation } from "react-router-dom";

export default function PostCourseResults() {
  const { state } = useLocation();
  const result = state?.result;
  if (!result) return <p className="p-6">No results yet.</p>;
  const finalGrade = typeof result.final_grade === 'number' ? result.final_grade : (typeof result.score === 'number' ? result.score : 0);
  const status = result.summary || (result.passed != null ? (result.passed ? 'Passed' : 'Failed') : '');
  const feedbackArray = Array.isArray(result.ai_feedback)
    ? result.ai_feedback
    : result.feedback
      ? Object.entries(result.feedback).map(([skill, v]) => ({ skill, score: v?.score ?? 0, weight: v?.weight, feedback: v?.feedback }))
      : [];
  return (
    <section className="personalized-dashboard">
      <div className="dashboard-container">
        <h1 className="section-title">Post-Course Evaluation Results</h1>
        {result?.version != null && (
          <p className="text-sm mb-2">Attempt Version: {result.version}</p>
        )}
        <div className="dashboard-card" style={{ textAlign: 'left' }}>
          <p className="text-lg font-semibold">Final Grade: {finalGrade}</p>
          <p className="mt-2">Status: {status}</p>
        </div>
        <div className="space-y-3 mt-4">
          {feedbackArray.map((f, i) => (
            <div key={i} className="p-3 dashboard-card" style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="font-medium">{f.skill}</div>
                  <div className="text-sm">Score: {f.score}{typeof f.weight === 'number' ? ` • Weight: ${f.weight}` : ''}</div>
                  {f.feedback ? <div className="text-sm mt-1">{f.feedback}</div> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        {result.artifact_path ? (
          <p className="text-sm mt-3 text-gray-600">Artifact recorded at: {result.artifact_path}</p>
        ) : null}
      </div>
    </section>
  );
}


