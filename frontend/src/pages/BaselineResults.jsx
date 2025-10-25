import React from "react";

export default function BaselineResults({ result }) {
  if (!result) return <div className="p-6">No results available.</div>;
  return (
    <section className="personalized-dashboard">
      <div className="dashboard-container">
        <h1 className="section-title">AI Evaluation Results</h1>
        <div className="mb-4 p-4 dashboard-card">
        <p className="text-lg font-semibold">Final Grade: {result.final_grade}</p>
        <p className="mt-2">{result.summary}</p>
        <p className="mt-1 text-sm">{result.timestamp}</p>
        </div>
        <div className="space-y-3">
          {result.ai_feedback?.map((item, idx) => (
            <div key={idx} className="p-3 dashboard-card" style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="font-medium">{item.skill}</div>
                  <div className="text-sm">Score: {item.score}</div>
                </div>
                <span className="btn" style={{ background: item.passed ? 'var(--gradient-secondary)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff' }}>
                  {item.passed ? 'Passed' : 'Needs Improvement'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


