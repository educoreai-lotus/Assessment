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

const { evaluate } = require('../services/postCourseEvaluator');

exports.submitPostCourseExam = async (req, res) => {
    try {
        const { exam_id, answers, questions } = req.body || {};
        const userId = req.user?.sub || 'demo-user';
        const result = await evaluate({ answers: answers || {}, questions: questions || [], userId });
        res.json({ exam_id, ...result });
    } catch (err) {
        res.status(500).json({ error: 'server_error', message: err.message });
    }
};


