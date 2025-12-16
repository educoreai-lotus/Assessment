function buildDevLabCodingRequestPayload({ amount, skills, humanLanguage = 'en', difficulty = 'medium' } = {}) {
  return {
    action: 'coding',
    amount: amount ?? 1,
    difficulty,
    humanLanguage,
    programming_language: 'javascript',
    skills: Array.isArray(skills) ? skills : [],
    // explicit routing and classification for Coordinator
    route: { destination: 'devlab', strict: true },
    content: { type: 'coding' },
  };
}

function buildDevLabGradePayload({ attempt, answers, questions, session_token } = {}) {
  return {
    action: 'grade-coding',
    attempt_id: attempt?.attempt_id ?? null,
    answers: Array.isArray(answers) ? answers : [],
    questions: Array.isArray(questions) ? questions : undefined,
    session_token: session_token || undefined,
    // explicit routing and classification for Coordinator
    route: { destination: 'devlab', strict: true },
    content: { type: 'coding' },
  };
}

function buildDevLabWidgetPayload({ attempt_id, skills, difficulty = 'medium' } = {}) {
  return {
    action: 'coding-widget',
    attempt_id: attempt_id ?? null,
    skills: Array.isArray(skills) ? skills : [],
    difficulty,
  };
}

module.exports = {
  buildDevLabCodingRequestPayload,
  buildDevLabGradePayload,
  buildDevLabWidgetPayload,
};


