// Skills Engine mock payloads per exact data contracts
exports.mockFetchBaselineSkills = async ({ user_id, user_name }) => {
  return {
    user_id: user_id || 'u_123',
    user_name: user_name || 'Jane Doe',
    skills: [
      { skill_id: 's_html', level: 'nano' },
      { skill_id: 's_js_async', level: 'micro' },
    ],
    passing_grade: 70,
  };
};

exports.mockPushAssessmentResults = async (payload) => {
  return { status: 'accepted', payload };
};


