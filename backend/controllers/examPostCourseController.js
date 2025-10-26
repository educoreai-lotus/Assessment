const { fetchDevLabChallenge } = require('../services/integrations/devLab');
const { getLearnerProfile } = require('../services/integrations/directory');
const { getSkillTargets } = require('../services/integrations/skillsEngine');
const { generateQuestions } = require('../services/ai/questionGenerator');

function pickRandom(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (copy.length && out.length < n) {
        const idx = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
    }
    return out;
}

const { getAttempts, incrementAttempt } = require('../services/integrations/directory');

exports.buildPostCourseExam = async (req, res) => {
    const userId = req.user?.sub || 'demo-user';
    const { attempts, maxAttempts } = await getAttempts({ userId, examType: 'postcourse' });
    if (attempts >= maxAttempts) {
        return res.status(403).json({ error: 'RETAKE_LIMIT_EXCEEDED', message: 'Maximum Post-Course exam attempts reached.' });
    }
    const profile = await getLearnerProfile(userId);
    const targetSkills = await getSkillTargets(profile);
    // Prefer applied/scenario-style for post-course
    const aiQs = await generateQuestions({ targetSkills, courseId: profile.course_id, examType: 'postcourse' });
    // Select two diverse written questions
    const written = pickRandom(aiQs.filter(q => q.type === 'written'), 2);
    const challenge = await fetchDevLabChallenge({ skill: 'javascript' });
    const questions = [
        ...written,
        { id: 'devlab_code', type: 'devlab', title: challenge.title, prompt: challenge.prompt, examples: challenge.examples, starter_code: challenge.starter_code, tests: challenge.tests },
    ];
    const returnUrl = (req?.query?.return) || (req?.headers?.['x-return-url']) || undefined;
    res.json({
        exam_id: 'postcourse-' + Date.now(),
        title: 'Post-Course Exam',
        duration_min: questions.length * 3,
        question_count: questions.length,
        attempt: attempts + 1,
        max_attempts: maxAttempts,
        return_url: returnUrl,
        questions,
    });
};

const { evaluatePostCourseExam } = require('../services/postCourseEvaluator');

exports.submitPostCourseExam = async (req, res) => {
    try {
        const { exam_id, user_id, answers, questions, rubric, meta } = req.body || {};
        const userId = user_id || req.user?.sub || 'demo-user';
        const result = await evaluatePostCourseExam({ examId: exam_id, userId, questions: questions || [], answers: answers || {}, rubric, meta });
        await incrementAttempt({ userId, examType: 'postcourse', examId: exam_id, score: result.score_total ?? result.score, passed: result.passed });
        res.json({ ...result, attempt_info: await getAttempts({ userId, examType: 'postcourse' }) });
    } catch (err) {
        res.status(500).json({ error: 'server_error', message: err.message });
    }
};


