// Learning Analytics mock payloads per exact data contracts
// Match integrationController.handleGetIntegration expected numeric types.
exports.mockBaselineAnalytics = async () => {
  return {
    user_id: 123,
    exam_type: 'baseline',
    passing_grade: 70,
    final_grade: 68,
    passed: false,
    skills: [
      { skill_id: 's_html', skill_name: 'HTML Structure', score: 65, status: 'failed' },
      { skill_id: 's_js_async', skill_name: 'Asynchronous Programming', score: 72, status: 'acquired' },
    ],
    submitted_at: '2025-11-05T14:33:00Z',
  };
};

exports.mockPostcourseAnalytics = async () => {
  return {
    user_id: 123,
    exam_type: 'postcourse',
    course_id: 789,
    course_name: 'Intro to JS',
    attempt_no: 2,
    passing_grade: 70,
    max_attempts: 3,
    final_grade: 82,
    passed: true,
    skills: [
      { skill_id: 's_html', skill_name: 'HTML Structure', score: 85, status: 'acquired' },
      { skill_id: 's_js_async', skill_name: 'Asynchronous Programming', score: 78, status: 'acquired' },
    ],
    submitted_at: '2025-11-07T16:48:22Z',
  };
};


