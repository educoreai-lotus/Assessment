exports.buildPostCourseExam = (req, res) => {
    res.json({
        exam_id: 'postcourse-' + Date.now(),
        title: 'Post-Course Exam',
        questions: [
            { id: 1, question: 'What is Node.js used for?' },
            { id: 2, question: 'Explain REST vs gRPC briefly.' },
        ],
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


