const { evaluatePostCourseExam } = require('./aiEvaluator');

async function evaluate({ answers = {}, questions = [], userId = 'demo-user' } = {}) {
    return await evaluatePostCourseExam(answers, questions, { userId });
}

module.exports = { evaluate };


