import React from "react";

export default function QuestionCard({ question, index, total, selected, onAnswer }) {
  const isDevLab = String(question?.type).toLowerCase() === 'devlab';
  return (
    <div className="question-card rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm p-6 transition-colors" style={{ marginBottom: 24 }}>
      <h2 className="question-title text-lg font-semibold tracking-wide mb-2">
        Question {index + 1} of {total}
      </h2>
      {question.title ? <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">{question.title}</div> : null}
      {question.context ? <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{question.context}</div> : null}
      <p className="question-text text-lg font-semibold tracking-wide mb-4 text-gray-800 dark:text-gray-100" style={{ lineHeight: 1.6 }}>{question.prompt || question.question}</p>

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
        <div className="answer-options grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginTop: 16 }}>
          {question.options.map((opt, i) => (
            <label key={i} className="answer-option focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-500" style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-light, rgba(148, 163, 184, 0.3))', transition: 'background 0.2s ease, transform 0.2s ease' }}>
              <input
                type="radio"
                name={question.id}
                value={opt}
                checked={selected === opt}
                onChange={(e) => onAnswer(e.target.value)}
                className="mr-3"
              />
              <span className="text-base leading-relaxed text-gray-800 dark:text-gray-100">{opt}</span>
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


