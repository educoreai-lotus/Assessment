import React from "react";

export default function BaselineResults({ result }) {
  if (!result) return <div className="p-6">No results available.</div>;
  const passed = !!(result.passed || (result.summary === 'Passed'));
  const grade = typeof result.final_grade === 'number' ? result.final_grade : 0;
  const gradeColor = passed ? 'text-green-600' : 'text-red-600';
  const attempt = result.attempt;
  const max = result.max_attempts;
  const feedback = Array.isArray(result.ai_feedback) ? result.ai_feedback : [];
  const thresholds = result.passing_thresholds || { default: 70, skills: {} };
  const skillStatus = result.skill_status || {};
  return (
    <section className="personalized-dashboard">
      <div className="dashboard-container">
        <h1 className="section-title">AI Evaluation Results</h1>
        {attempt != null && max != null && (
          <p className="text-sm mb-2">Attempt {attempt} of {max}</p>
        )}
        <div className="mb-4 p-4 dashboard-card" style={{ textAlign: 'left' }}>
          <p className={`text-lg font-semibold ${gradeColor}`}>Final Grade: {grade}</p>
          <p className="mt-2">{passed ? 'Passed' : 'Failed'}</p>
          <p className="mt-1 text-sm">Default passing: {thresholds.default}</p>
        </div>
        <div className="space-y-3">
          {feedback.map((item, idx) => (
            <div key={idx} className="p-3 dashboard-card" style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="font-medium">{item.skill}</div>
                  <div className="text-sm">
                    Score: {item.score}
                    {thresholds.skills && thresholds.skills[String(item.skill).toLowerCase()] != null ? (
                      <> • Pass: {thresholds.skills[String(item.skill).toLowerCase()]}</>
                    ) : null}
                  </div>
                  {skillStatus[String(item.skill).toLowerCase()] && (
                    <div className="text-sm mt-1">Status: {skillStatus[String(item.skill).toLowerCase()] === 'done' ? 'Done' : 'Needs Improvement'}</div>
                  )}
                </div>
                <span className="btn" style={{ background: item.passed ? 'var(--gradient-secondary)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff' }}>
                  {item.passed ? 'Passed' : 'Needs Improvement'}
                </span>
              </div>
            </div>
          ))}
        </div>
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


