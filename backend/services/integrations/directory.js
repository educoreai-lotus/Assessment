async function getPolicy() {
    return {
        passing_grade: 70,
        max_attempts: 3,
        note: 'Baseline exam ignores max_attempts',
    };
}

async function getPassingPolicy() {
    const p = await getPolicy();
    return { passing_grade: p.passing_grade, max_attempts: p.max_attempts };
}

async function getLearnerProfile(userId = 'demo-user') {
    // Mocked directory profile; in production, call DIRECTORY_API_URL
    return {
        user_id: userId,
        course_id: 'demo-course',
        org_id: 'demo-org',
        level: 'intermediate',
        preferences: { language: 'en' },
    };
}

module.exports = { getPolicy, getPassingPolicy, getLearnerProfile };


