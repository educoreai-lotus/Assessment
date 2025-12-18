// Skills Engine mock payloads per exact data contracts
exports.mockFetchBaselineSkills = async ({ user_id, user_name }) => {
  // Baseline taxonomy (JavaScript-only)
  const skills = [
    { skill_id: 'js_loops', skill_name: 'Loops', topic_name: 'javascript' },
    { skill_id: 'js_if_else', skill_name: 'If/Else', topic_name: 'javascript' },
    { skill_id: 'js_promises', skill_name: 'Promises', topic_name: 'javascript' },
  ];
  return {
    user_id: user_id || 'u_123',
    user_name: user_name || 'Jane Doe',
    skills,
    passing_grade: 70,
  };
};

exports.mockPushAssessmentResults = async (payload) => {
  return { status: 'accepted', payload };
};


