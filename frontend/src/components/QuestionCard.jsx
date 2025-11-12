import { useState } from 'react';

export default function QuestionCard({ question, onAnswer }) {
  const [value, setValue] = useState('');
  const isMcq = question?.type === 'mcq';
  const isText = question?.type === 'text';
  const isCode = question?.type === 'code';

  return (
    <div className="card p-5">
      <div className="mb-2 text-sm text-emeraldbrand-300">{question?.skill || 'General'}</div>
      <h3 className="text-lg font-semibold mb-3">{question?.prompt}</h3>

      {isMcq && (
        <div className="space-y-2">
          {question.options?.map((opt, idx) => (
            <label key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name={`q-${question.id}`}
                value={opt}
                className="accent-emeraldbrand-500"
                onChange={(e) => setValue(e.target.value)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {isText && (
        <textarea
          className="mt-2 w-full rounded-xl bg-neutral-800 border border-neutral-700 p-3 focus:outline-none focus:ring-2 focus:ring-emeraldbrand-500"
          rows={4}
          placeholder="Type your answer..."
          onChange={(e) => setValue(e.target.value)}
        />
      )}

      {isCode && (
        <textarea
          className="mt-2 w-full font-mono rounded-xl bg-neutral-900 border border-neutral-700 p-3 focus:outline-none focus:ring-2 focus:ring-emeraldbrand-500"
          rows={8}
          placeholder="// Write your solution..."
          onChange={(e) => setValue(e.target.value)}
        />
      )}

      <div className="mt-4 flex justify-end">
        <button
          className="btn-emerald"
          onClick={() => onAnswer?.(question.id, value)}
        >
          Save Answer
        </button>
      </div>
    </div>
  );
}


