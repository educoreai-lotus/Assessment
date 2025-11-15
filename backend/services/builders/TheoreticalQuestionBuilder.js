/**
 * TheoreticalQuestionBuilder
 * Normalizes theoretical question objects with enforced difficulty rules.
 *
 * Rules:
 * - Default allowExternalDifficulty = false
 * - If allowExternalDifficulty is true, use provided difficulty when present
 * - Otherwise force difficulty to 'medium'
 */

function normalizeType(type) {
  const t = String(type || "").toLowerCase();
  // Normalize theoretical types to 'mcq' for consistency with storage
  if (!t || t === "theoretical" || t === "theory" || t === "mcq") return "mcq";
  return t;
}

function buildTheoreticalQuestion(input, allowExternalDifficulty = false) {
  const question = input || {};
  const type = normalizeType(question.type);
  const base = {
    type,
    stem: question.stem || "",
    choices: Array.isArray(question.choices) ? question.choices : [],
    correct_answer: question.correct_answer ?? null,
  };

  let difficulty = "medium";
  if (
    allowExternalDifficulty &&
    typeof question.difficulty === "string" &&
    question.difficulty.trim() !== ""
  ) {
    difficulty = question.difficulty;
  }

  return { ...base, difficulty };
}

module.exports = { buildTheoreticalQuestion };
