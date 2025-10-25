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

exports.submitPostCourseExam = (req, res) => {
    const { exam_id, answers } = req.body || {};
    console.log('Received answers:', answers);
    res.json({
        exam_id,
        score: 85,
        passed: true,
        feedback: 'Excellent work! Your understanding improved significantly.',
    });
};


