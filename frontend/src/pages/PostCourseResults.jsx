import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SkillResultCard from "../components/SkillResultCard";

export default function PostCourseResults() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  console.log("PostCourseResults loaded", result);
  console.log("DEBUG:", result?.requires_retake, result?.attempt_info?.attempts, result?.attempt_info?.maxAttempts);
  useEffect(() => {
    if (state?.result) {
      setResult(state.result);
    }
  }, [state]);
  if (!result) return <p className="p-6">Loading results...</p>;
  const finalGrade = typeof result.final_grade === 'number' ? result.final_grade : (typeof result.score_total === 'number' ? result.score_total : (typeof result.score === 'number' ? result.score : 0));
  const status = result.summary || (result.passed != null ? (result.passed ? 'Passed' : 'Failed') : '');
  const gradeColor = result.passed ? 'text-green-600' : 'text-red-600';
  const attemptInfo = result.attempt_info || null;
  const thresholds = result.passing_thresholds || { default: 70, skills: {} };
  const feedbackMap = result.feedback && !Array.isArray(result.feedback)
    ? result.feedback
    : (Array.isArray(result.ai_feedback)
        ? Object.fromEntries(result.ai_feedback.map(s => [String(s.skill).toLowerCase(), { score: s.score, feedback: s.feedback, weight: s.weight }]))
        : {});
  console.log("Render conditions:", result?.requires_retake, result?.attempt_info?.attempts, result?.attempt_info?.maxAttempts);
  return (
    <section className="personalized-dashboard">
      <div>
      <div className="dashboard-container max-w-3xl mx-auto mt-12 px-6">
        <h1 className="section-title">Post-Course Evaluation Results</h1>
        {attemptInfo ? (
          <div className="text-sm text-gray-500 mb-2">Attempt {attemptInfo.attempts} of {attemptInfo.maxAttempts}</div>
        ) : null}
        {result.requires_retake ? (
          <div className="alert-warning">You must retake this exam to pass the course.</div>
        ) : (
          <div className="alert-success">✅ Course passed successfully!</div>
        )}
        {!result.passed && Array.isArray(result.unmet_skills) && result.unmet_skills.length ? (
          <div className="rounded-md border border-gray-200 bg-white dark:bg-gray-900 p-3 mb-4">
            <div className="text-sm font-semibold mb-1">Unmet skills</div>
            <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
              {result.unmet_skills.map(s => (<li key={s}>{s}</li>))}
            </ul>
          </div>
        ) : null}
        {result?.requires_retake && result?.attempt_info?.attempts < result?.attempt_info?.maxAttempts && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => navigate("/postcourse")}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2 rounded-lg transition-all"
            >
              🔁 Retake Exam
            </button>
          </div>
        )}

        {result?.requires_retake && result?.attempt_info?.attempts >= result?.attempt_info?.maxAttempts && (
          <div className="mt-4 p-4 bg-red-100 border border-red-300 text-red-700 text-center rounded-lg">
            🚫 You have reached the maximum number of attempts. Please contact your instructor or support for assistance.
          </div>
        )}
        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm p-6 border border-gray-100 dark:border-gray-700 mb-6 transition-colors" style={{ textAlign: 'left' }}>
          <h2 className={`text-2xl font-semibold ${result.passed ? 'text-green-600' : 'text-red-600'} dark:text-gray-100`}>Final Grade: {finalGrade}</h2>
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
          <p className="text-sm mt-3 text-gray-600 dark:text-gray-300">Artifact recorded at: {result.artifact_path}</p>
        ) : null}
        <button disabled={attemptInfo && attemptInfo.attempts >= attemptInfo.maxAttempts}
          onClick={() => {
          const u = localStorage.getItem('returnUrl') || result.return_url || '/';
          window.location.href = u;
        }} className={`mt-6 inline-flex items-center rounded-lg px-5 py-2 font-medium transition-all shadow-md ${attemptInfo && attemptInfo.attempts >= attemptInfo.maxAttempts ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
          {attemptInfo && attemptInfo.attempts >= attemptInfo.maxAttempts ? 'Attempts Exhausted' : 'Return to Portal'}
        </button>
      </div>
      </div>
    </section>
  );
}


