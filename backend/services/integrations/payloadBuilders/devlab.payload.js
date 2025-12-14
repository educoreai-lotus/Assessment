function buildDevLabCodingRequestPayload({ amount, skills, humanLanguage = 'en', difficulty = 'medium' } = {}) {
  return {
    action: 'coding',
    amount: amount ?? 1,
    difficulty,
    humanLanguage,
    programming_language: 'javascript',
    skills: Array.isArray(skills) ? skills : [],
  };
}

function buildDevLabGradePayload({ attempt, answers, questions } = {}) {
  return {
    action: 'grade-coding',
    attempt_id: attempt?.attempt_id ?? null,
    answers: Array.isArray(answers) ? answers : [],
    questions: Array.isArray(questions) ? questions : undefined,
  };
}

module.exports = {
  buildDevLabCodingRequestPayload,
  buildDevLabGradePayload,
};


