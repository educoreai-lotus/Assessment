import React from "react";
import { useLocation } from "react-router-dom";
import SkillResultCard from "../components/SkillResultCard";

export default function PostCourseResults() {
  const { state } = useLocation();
  const result = state?.result;
  if (!result) return <p className="p-6">No results yet.</p>;
  const finalGrade = typeof result.final_grade === 'number' ? result.final_grade : (typeof result.score_total === 'number' ? result.score_total : (typeof result.score === 'number' ? result.score : 0));
  const status = result.summary || (result.passed != null ? (result.passed ? 'Passed' : 'Failed') : '');
  const gradeColor = result.passed ? 'text-green-600' : 'text-red-600';
  const attemptInfo = result.attempt_info || (result.attempt && result.max_attempts ? { attempts: result.attempt, maxAttempts: result.max_attempts } : null);
  const thresholds = result.passing_thresholds || { default: 70, skills: {} };
  const feedbackMap = result.feedback && !Array.isArray(result.feedback)
    ? result.feedback
    : (Array.isArray(result.ai_feedback)
        ? Object.fromEntries(result.ai_feedback.map(s => [String(s.skill).toLowerCase(), { score: s.score, feedback: s.feedback, weight: s.weight }]))
        : {});
  return (
    <section className="personalized-dashboard">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <div className="dashboard-container max-w-3xl mx-auto mt-12 px-6">
        <h1 className="section-title">Post-Course Evaluation Results</h1>
        {attemptInfo ? (
          <div className="text-sm text-gray-500 mb-2">Attempt {attemptInfo.attempts} of {attemptInfo.maxAttempts}</div>
        ) : null}
        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm p-6 border border-gray-100 dark:border-gray-700 mb-6 transition-colors duration-300" style={{ textAlign: 'left' }}>
          <h2 className={`text-2xl font-semibold ${result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Final Grade: {finalGrade}</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {result.passed
              ? `User achieved a final grade of ${finalGrade}, meeting passing criteria.`
              : `User achieved a final grade of ${finalGrade}, below the passing grade of ${thresholds?.default ?? 70}.`}
          </p>
          {result?.score_by_type ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sections — Written: {result.score_by_type.written ?? 0}, Code: {result.score_by_type.code ?? 0}
            </div>
          ) : null}
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
        {result.artifact_path ? (
          <p className="text-sm mt-3 text-gray-600 dark:text-gray-400">Artifact recorded at: {result.artifact_path}</p>
        ) : null}
        <button onClick={() => {
          const u = localStorage.getItem('returnUrl') || result.return_url || '/';
          window.location.href = u;
        }} className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-white font-medium hover:bg-emerald-700 transition-all shadow-md">
          Return to Portal
        </button>
      </div>
      </div>
    </section>
  );
}


