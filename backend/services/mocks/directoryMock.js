// Directory mock payloads per exact data contracts
exports.mockFetchPolicy = async (examType) => {
  if (examType === 'postcourse') {
    return { passing_grade: 70, max_attempts: 3 };
  }
  return { passing_grade: 70 };
};

exports.mockPushExamResults = async (payload) => {
  // Echo back an acknowledgement with the same payload shape
  return { status: 'accepted', payload };
};


