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

// Deterministic coding grading mock (no randomness)
exports.mockGradeCodingAnswers = async (payload) => {
  const answers = Array.isArray(payload?.answers) ? payload.answers : [];
  const results = answers.map((a) => {
    const code = (a && typeof a.code_answer === 'string') ? a.code_answer : '';
    const normalized = code.toLowerCase();
    const requiredKeywords = ['function', 'return', 'for', 'while', 'map', 'filter', 'reduce', 'async'];
    const matches = requiredKeywords.filter(k => normalized.includes(k)).length;

    let score = 0;
    const implementsAdd = /\breturn\s+[^;]*\b[a-zA-Z_]\w*\s*\+\s*[a-zA-Z_]\w*/.test(normalized) || /\ba\s*\+\s*b\b/.test(normalized);
    if (implementsAdd) {
      score = 100; // expected algorithm detected
    } else if (matches >= 3) {
      score = 70; // reasonable structural match
    } else if (matches >= 1) {
      score = 40; // partial structure
    } else {
      score = 0; // no recognizable structure
    }

    const status = score >= 70 ? 'acquired' : 'not_acquired';
    return {
      question_id: String(a?.question_id || ''),
      skill_id: String(a?.skill_id || ''),
      score,
      status,
      feedback: status === 'acquired' ? 'Meets requirements.' : 'Needs improvement.',
    };
  });

  const final_grade = results.length > 0
    ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
    : 0;

  return { success: true, results, final_grade };
};


