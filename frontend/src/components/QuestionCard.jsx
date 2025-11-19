export default function QuestionCard({ question, value, onChange }) {
  const isMcq = question?.type === 'mcq';
  const isText = question?.type === 'text';
  const isCode = question?.type === 'code';

  const prompt =
    typeof question?.prompt === 'string'
      ? question.prompt
      : (question?.prompt?.question || question?.prompt?.stem || '');
  const renderedPrompt = String(prompt || '');

  return (
    <div className="card p-5">
      <div className="mb-2 text-sm text-emeraldbrand-300">{question?.skill || 'General'}</div>
      <h3 className="text-lg font-semibold mb-3">{renderedPrompt}</h3>

      {isMcq && (
        <div className="space-y-2">
          {question.options?.map((opt, idx) => (
            <label key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name={`q-${question.id}`}
                value={opt}
                checked={value === opt}
                className="accent-emeraldbrand-500"
                onChange={(e) => onChange?.(question.id, e.target.value)}
              />
              <span>{String(opt)}</span>
            </label>
          ))}
        </div>
      )}

      {isText && (
        <textarea
          className="mt-2 w-full rounded-xl bg-white text-gray-900 dark:bg-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 p-3 focus:outline-none focus:ring-2 focus:ring-emeraldbrand-500"
          rows={4}
          placeholder="Type your answer..."
          value={value || ''}
          onChange={(e) => onChange?.(question.id, e.target.value)}
        />
      )}

      {isCode && (
        <textarea
          className="mt-2 w-full font-mono rounded-xl bg-white text-gray-900 dark:bg-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 p-3 focus:outline-none focus:ring-2 focus:ring-emeraldbrand-500"
          rows={8}
          placeholder="// Write your solution..."
          value={value || ''}
          onChange={(e) => onChange?.(question.id, e.target.value)}
        />
      )}
    </div>
  );
}
