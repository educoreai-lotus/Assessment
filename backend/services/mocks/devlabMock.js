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

// Mock grading for coding answers with realistic scores (60–100) and averaged final grade
exports.mockGradeCodingAnswers = async (payload) => {
  const answers = Array.isArray(payload?.answers) ? payload.answers : [];
  const results = answers.map((a) => {
    const score = Math.floor(Math.random() * 41) + 60; // 60–100
    const status = score >= 70 ? 'acquired' : 'not_acquired';
    return {
      question_id: String(a.question_id || ''),
      skill_id: String(a.skill_id || ''),
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


