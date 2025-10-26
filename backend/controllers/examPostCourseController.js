const { fetchDevLabChallenge } = require('../services/integrations/devLab');

exports.buildPostCourseExam = async (req, res) => {
    const challenge = await fetchDevLabChallenge();
    const questions = [
        { id: 'q1', type: 'theoretical', question: 'What is Node.js used for?', skill: 'Node.js Basics', expected_answer: 'server-side javascript runtime' },
        { id: 'q2', type: 'theoretical', question: 'Explain REST vs gRPC briefly.', skill: 'API Design', expected_answer: 'rest is http json, grpc is binary rpc' },
        { id: 'devlab_code', type: 'devlab', title: challenge.title, prompt: challenge.prompt, starter_code: challenge.starter_code, tests: challenge.tests },
    ];
    res.json({
        exam_id: 'postcourse-' + Date.now(),
        title: 'Post-Course Exam',
        duration_min: questions.length * 3,
        question_count: questions.length,
        questions,
    });
};

const { evaluatePostCourseExam } = require('../services/postCourseEvaluator');

exports.submitPostCourseExam = async (req, res) => {
    try {
        const { exam_id, user_id, answers, questions, rubric, meta } = req.body || {};
        const userId = user_id || req.user?.sub || 'demo-user';
        const result = await evaluatePostCourseExam({ examId: exam_id, userId, questions: questions || [], answers: answers || {}, rubric, meta });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'server_error', message: err.message });
    }
};


