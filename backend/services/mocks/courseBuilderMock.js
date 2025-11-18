// Course Builder mock payloads per exact data contracts
exports.mockFetchCoverage = async ({ learner_id, learner_name, course_id }) => {
  return {
    learner_id: learner_id || 'u_123',
    learner_name: learner_name || 'Jane Doe',
    course_id: course_id || 'c_789',
    course_name: 'Intro to JS',
    coverage_map: [
      { lesson_id: 'L101', skills: ['s_js_async', 's_js_promises'] },
    ],
  };
};

exports.mockPushExamResults = async (payload) => {
  return { status: 'accepted', payload };
};


