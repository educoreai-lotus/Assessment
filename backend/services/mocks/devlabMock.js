// DevLab mock payloads per exact data contracts
exports.mockGetCodingQuestions = async () => {
  // Return envelope with an array of at least one valid coding question.
  // The integration layer will decorate with language, skills, and requested_at.
  return {
    questions: [
      {
        qid: 'devlab_q42',
        type: 'code',
        // Required by ExamPackageCodingQuestionSchema after mapping/decoration
        question: 'Write a function that returns the sum of two numbers.',
        starter_code: '// your code here\nfunction add(a, b) {\n  // TODO\n}',
        expected_output: 'add(2, 3) === 5',
        test_cases: [
          { input: [2, 3], output: 5 },
          { input: [-1, 1], output: 0 },
        ],
        // Additional metadata carried by mocks (ignored by strict schema if not declared)
        evaluation: { type: 'text', rubric: [] },
        metadata: {},
        // Common fields used by mapping
        difficulty: 'medium',
        skill_id: 's_js_basics',
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


