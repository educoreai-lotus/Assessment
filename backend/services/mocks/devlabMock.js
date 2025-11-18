// DevLab mock payloads per exact data contracts
exports.mockGetCodingQuestions = async () => {
  // Return at least one valid coding question aligned with ExamPackageCodingQuestionSchema
  return {
    questions: [
      {
        qid: 'devlab_q42',
        type: 'code',
        question: 'Write a function that returns the sum of two numbers.',
        starter_code: '// your code here\nfunction add(a, b) {\n  // TODO\n}',
        expected_output: 'add(2, 3) === 5',
        test_cases: [
          { input: [2, 3], output: 5 },
          { input: [-1, 1], output: 0 },
        ],
        programming_language: 'javascript',
        humanLanguage: 'en',
        skills: ['s_js_basics'],
        difficulty: 'medium',
        // Additional metadata carried by mocks
        evaluation: { type: 'text', rubric: [] },
        metadata: {},
        lesson_id: 'L-101',
        course_name: 'Intro to JS',
      },
    ],
  };
};

exports.mockRequestTheoreticalValidation = async () => {
  return {
    status: 'validated',
    quality_score: 0.95,
    difficulty: 'hard',
    duplicate: false,
  };
};

// Deterministic mock grading for coding answers
exports.mockGradeCodingAnswers = async (payload) => {
  const answers = Array.isArray(payload?.answers) ? payload.answers : [];
  const results = answers.map((a) => {
    const code = a?.code_answer ? String(a.code_answer) : '';
    // Simple deterministic scoring: base on length and presence of async/function keywords
    let score = 50;
    if (/\bfunction\b/.test(code)) score += 15;
    if (/\basync\b/.test(code)) score += 15;
    score += Math.min(20, Math.floor(code.length / 50)); // +1 per 50 chars up to +20
    if (score > 100) score = 100;
    const status = score >= 70 ? 'passed' : 'failed';
    return {
      question_id: String(a.question_id || ''),
      skill_id: String(a.skill_id || ''),
      score,
      status,
      feedback: status === 'passed' ? 'Meets requirements.' : 'Needs improvement.',
    };
  });
  return { results };
};


