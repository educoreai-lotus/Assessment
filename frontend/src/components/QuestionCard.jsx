import React from "react";

export default function QuestionCard({ question, index, total, selected, onAnswer }) {
  return (
    <div className="dashboard-card">
      <h2 className="font-semibold mb-2">
        Question {index + 1} of {total}
      </h2>
      <p className="mb-3">{question.question}</p>

      {question.options ? (
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


