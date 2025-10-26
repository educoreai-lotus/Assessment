import React from "react";
import { useLocation } from "react-router-dom";

export default function PostCourseResults() {
  const { state } = useLocation();
  const result = state?.result;
  if (!result) return <p className="p-6">No results yet.</p>;
  const finalGrade = typeof result.final_grade === 'number' ? result.final_grade : (typeof result.score_total === 'number' ? result.score_total : (typeof result.score === 'number' ? result.score : 0));
  const status = result.summary || (result.passed != null ? (result.passed ? 'Passed' : 'Failed') : '');
  const gradeColor = result.passed ? 'text-green-600' : 'text-red-600';
  const feedbackArray = Array.isArray(result.ai_feedback)
    ? result.ai_feedback
    : result.feedback
      ? Object.entries(result.feedback).map(([skill, v]) => ({ skill, score: v?.score ?? 0, weight: v?.weight, feedback: v?.feedback }))
      : [];
  const attemptInfo = result.attempt_info || (result.attempt && result.max_attempts ? { attempts: result.attempt, maxAttempts: result.max_attempts } : null);
  return (
    <section className="personalized-dashboard">
      <div className="dashboard-container">
        <h1 className="section-title">Post-Course Evaluation Results</h1>
        {attemptInfo ? (
          <p className="text-sm mb-2">Attempt {attemptInfo.attempts} of {attemptInfo.maxAttempts}</p>
        ) : null}
        <div className="dashboard-card" style={{ textAlign: 'left' }}>
          <p className={`text-lg font-semibold ${gradeColor}`}>Final Grade: {finalGrade}</p>
          <p className="mt-2">Status: {status}</p>
          {result?.score_by_type ? (
            <div className="mt-2 text-sm">
              Sections — Written: {result.score_by_type.written ?? 0}, Code: {result.score_by_type.code ?? 0}
            </div>
          ) : null}
          {result?.passing_thresholds ? (
            <div className="mt-2 text-sm text-gray-600">
              Default passing: {result.passing_thresholds.default}
            </div>
          ) : null}
        </div>
        <div className="space-y-3 mt-4">
          {feedbackArray.map((f, i) => (
            <div key={i} className="p-3 dashboard-card" style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="font-medium">{f.skill}</div>
                  <div className="text-sm">Score: {f.score}{typeof f.weight === 'number' ? ` • Weight: ${f.weight}` : ''}
                    {result?.passing_thresholds?.skills && result.passing_thresholds.skills[String(f.skill).toLowerCase()] != null ? (
                      <> • Pass: {result.passing_thresholds.skills[String(f.skill).toLowerCase()]}</>
                    ) : null}
                  </div>
                  {result?.skill_status && result.skill_status[String(f.skill).toLowerCase()] && (
                    <div className="text-sm mt-1">
                      Status: {result.skill_status[String(f.skill).toLowerCase()] === 'done' ? 'Done' : 'Needs Improvement'}
                    </div>
                  )}
                  {f.feedback ? <div className="text-sm mt-1">{f.feedback}</div> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        {result.artifact_path ? (
          <p className="text-sm mt-3 text-gray-600">Artifact recorded at: {result.artifact_path}</p>
        ) : null}
        <button onClick={() => {
          const u = localStorage.getItem('returnUrl') || result.return_url || '/';
          window.location.href = u;
        }} className="mt-6 inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800">
          Return to Portal
        </button>
      </div>
    </section>
  );
}


