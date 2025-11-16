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
  const normalizedTopicId =
    question.topic_id != null && Number.isFinite(Number(question.topic_id))
      ? Number(question.topic_id)
      : undefined;
  const normalizedLang =
    typeof question.humanLanguage === "string" && question.humanLanguage.trim() !== ""
      ? question.humanLanguage
      : undefined;
  const base = {
    type,
    // Normalized theoretical content string (stored separately in Mongo model too)
    question: typeof question.question === "string" && question.question.trim() !== "" ? question.question : (question.stem || ""),
    stem: question.stem || "",
    choices: Array.isArray(question.choices) ? question.choices : [],
    correct_answer: question.correct_answer ?? null,
    // Additional theoretical metadata fields carried forward for Mongo persistence
    topic_id: normalizedTopicId,
    topic_name: typeof question.topic_name === "string" ? question.topic_name : undefined,
    humanLanguage: normalizedLang,
    // Retain hints on the question object; storage layer may strip from learner-facing views
    hints: Array.isArray(question.hints) ? question.hints.map((h) => String(h)) : undefined,
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
