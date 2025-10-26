import React from "react";

export default function SkillResultCard({ skillKey, data, defaultThreshold = 70, thresholds = {} }) {
  const skill = String(skillKey || '').toLowerCase();
  const label = skill.replaceAll('_', ' ');
  const threshold = typeof thresholds[skill] === 'number' ? thresholds[skill] : defaultThreshold;
  const passed = Number(data?.score || 0) >= threshold;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4 bg-white dark:bg-gray-800 shadow-sm transition-colors">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{label}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Score: <strong>{data?.score ?? 0}</strong> • Threshold: <strong>{threshold}</strong>
      </p>
      <p className={`text-sm mt-1 ${passed ? 'text-green-600' : 'text-amber-600'}`}>
        {passed ? 'Status: Passed' : 'Status: Needs Improvement'}
      </p>
      {data?.feedback ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.feedback}</p>
      ) : null}
    </div>
  );
}
