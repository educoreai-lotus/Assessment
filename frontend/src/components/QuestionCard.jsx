import React from "react";

export default function QuestionCard({ question, index, total, selected, onAnswer }) {
  const isDevLab = String(question?.type).toLowerCase() === 'devlab';
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-6 transition-colors">
      <h2 className="font-semibold mb-2">
        Question {index + 1} of {total}
      </h2>
      {question.title ? <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">{question.title}</div> : null}
      {question.context ? <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{question.context}</div> : null}
      <p className="mb-3 text-gray-800 dark:text-gray-100">{question.prompt || question.question}</p>

      {isDevLab ? (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Coding challenge. Provide your solution in JavaScript.</p>
          {Array.isArray(question.examples) && question.examples.length ? (
            <div className="mb-3" style={{ textAlign: 'left' }}>
              <div className="font-semibold mb-1 text-gray-800 dark:text-gray-100">Example</div>
              {question.examples.map((ex, i) => (
                <div key={i} className="text-sm text-gray-700 dark:text-gray-200">
                  <div><span className="font-mono">input</span>: {JSON.stringify(ex.input)}</div>
                  <div><span className="font-mono">output</span>: {JSON.stringify(ex.output || ex.expected)}</div>
                </div>
              ))}
            </div>
          ) : null}
          <textarea
            rows={10}
            className="w-full border p-2 rounded font-mono bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 transition-colors"
            placeholder={question.starter_code || "// Write your solution here"}
            value={selected || ""}
            onChange={(e) => onAnswer(e.target.value)}
          />
        </div>
      ) : question.options ? (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <label key={i} className="block">
              <input
                type="radio"
                name={question.id}
                value={opt}
                checked={selected === opt}
                onChange={(e) => onAnswer(e.target.value)}
                className="mr-2"
              />
              <span className="text-gray-800 dark:text-gray-100">{opt}</span>
            </label>
          ))}
        </div>
      ) : (
        <textarea
          rows={4}
          className="w-full border p-2 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 transition-colors"
          placeholder="Write your answer..."
          value={selected || ""}
          onChange={(e) => onAnswer(e.target.value)}
        />
      )}
    </div>
  );
}


