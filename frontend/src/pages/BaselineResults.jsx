import React from "react";
import SkillResultCard from "../components/SkillResultCard";

export default function BaselineResults({ result }) {
  if (!result) return <div className="p-6">No results available.</div>;
  const passed = !!(result.passed || (result.summary === 'Passed'));
  const grade = typeof result.final_grade === 'number' ? result.final_grade : (typeof result.score_total === 'number' ? result.score_total : 0);
  const gradeColor = passed ? 'text-green-600' : 'text-red-600';
  const attempt = result.attempt;
  const max = result.max_attempts;
  const thresholds = result.passing_thresholds || { default: 70, skills: {} };
  // Normalize feedback map: prefer object map if present
  const feedbackMap = result.feedback && !Array.isArray(result.feedback)
    ? result.feedback
    : (Array.isArray(result.ai_feedback)
        ? Object.fromEntries(result.ai_feedback.map(s => [String(s.skill).toLowerCase(), { score: s.score, feedback: s.feedback }]))
        : {});

  return (
    <section className="personalized-dashboard">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <div className="dashboard-container max-w-3xl mx-auto mt-12 px-6">
        <h1 className="section-title">AI Evaluation Results</h1>
        {attempt != null && max != null && (
          <div className="text-sm text-gray-500 mb-2">Attempt {attempt} of {max}</div>
        )}
        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm p-6 border border-gray-100 dark:border-gray-700 mb-6 transition-colors duration-300">
          <h2 className={`text-2xl font-semibold ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Final Grade: {grade}</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {passed
              ? `User achieved a final grade of ${grade}, meeting passing criteria.`
              : `User achieved a final grade of ${grade}, below the passing grade of ${thresholds?.default ?? 70}.`}
          </p>
        </div>

        <div className="mt-4">
          {Object.entries(feedbackMap).map(([skill, data]) => (
            <SkillResultCard
              key={skill}
              skillKey={skill}
              data={data}
              defaultThreshold={thresholds?.default ?? 70}
              thresholds={thresholds?.skills ?? {}}
            />
          ))}
        </div>

        <button onClick={() => {
          const u = result.return_url || localStorage.getItem('returnUrl') || '/';
          window.location.href = u;
        }} className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-white font-medium hover:bg-emerald-700 transition-all shadow-md">
          Return to Portal
        </button>
      </div>
      </div>
    </section>
  );
}


