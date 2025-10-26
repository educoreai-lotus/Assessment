import React from "react";

export default function QuestionCard({ question, index, total, selected, onAnswer }) {
  const isDevLab = String(question?.type).toLowerCase() === 'devlab';
  return (
    <div className="dashboard-card">
      <h2 className="font-semibold mb-2">
        Question {index + 1} of {total}
      </h2>
      <p className="mb-3">{question.title ? `${question.title} — ` : ''}{question.question}</p>

      {isDevLab ? (
        <div>
          <p className="text-sm text-gray-600 mb-2">Coding challenge. Provide your solution in JavaScript.</p>
          <textarea
            rows={10}
            className="w-full border p-2 rounded font-mono"
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
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <textarea
          rows={4}
          className="w-full border p-2 rounded"
          placeholder="Write your answer..."
          value={selected || ""}
          onChange={(e) => onAnswer(e.target.value)}
        />
      )}
    </div>
  );
}


