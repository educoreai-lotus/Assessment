// Schema documentation (lightweight, no DB driver in demo env)
// Fields: requires_retake, attempt, max_attempts, passed_skills, unmet_skills, course_passing_grade, version

module.exports = {
    schema: 'v1-doc',
    fields: {
        user_id: 'string',
        exam_id: 'string',
        type: 'string',
        attempt: 'number',
        max_attempts: 'number',
        final_grade: 'number',
        requires_retake: 'boolean',
        passed_skills: 'string[]',
        unmet_skills: 'string[]',
        course_passing_grade: 'number',
        version: 'number',
        created_at: 'ISODate',
    },
};


