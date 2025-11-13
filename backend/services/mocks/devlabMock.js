// DevLab mock payloads per exact data contracts
exports.mockGetCodingQuestions = async () => {
  return {
    questions: [
      {
        qid: 'devlab_q42',
        type: 'code',
        difficulty: 'medium',
        skill_id: 's_js_async',
        lesson_id: 'L-101',
        course_name: 'Intro to JS',
        stem: 'Write an async function that fetches data from an API and logs the result.',
        expected_output: '{ data: ... }',
        correct_answer:
          'async function fetchData(url){ const res = await fetch(url); const data = await res.json(); console.log(data); }',
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


