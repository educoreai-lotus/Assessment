const { fetchDevLabChallenge } = require('../services/integrations/devLab');
const { getLearnerProfile, getAttempts, getPassingGrades, getUserExamConfig } = require('../services/integrations/directory');
const { getSkillTargets } = require('../services/integrations/skillsEngine');
const { generateQuestions } = require('../services/ai/questionGenerator');
const { recordAttempt } = require('../services/attemptTracker');

function pickRandom(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (copy.length && out.length < n) {
        const idx = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
    }
    return out;
}

const { incrementAttempt } = require('../services/integrations/directory');
const { auditRetakeExam } = require('../services/postCourseEvaluator');
const { saveResult, getLastAttempt } = require('../services/postCourseResultsStore');

exports.buildPostCourseExam = async (req, res) => {
    try {
        const userId = req.user?.sub || 'demo-user';
        const directory = await getUserExamConfig(userId, 'postcourse');
        const { max_attempts, course_passing_grade, skill_thresholds } = directory;
        const attemptInfo = await getAttempts({ userId, examType: 'postcourse' });
        const attempts_used = attemptInfo.attempts;
        if (attempts_used >= max_attempts) {
            return res.status(403).json({ error: 'POSTCOURSE_LOCKED', message: 'No remaining attempts.' });
        }

        // Determine unmet skills from last saved result if any
        let unmetSkills = null;
        const last = getLastAttempt(userId);
        if (last && last.requires_retake && (last.unmet_skills || []).length) {
            unmetSkills = last.unmet_skills;
        }

        const profile = await getLearnerProfile(userId);
        let targetSkills = await getSkillTargets(profile);

        if (Array.isArray(unmetSkills) && unmetSkills.length) {
            targetSkills = targetSkills.filter(s => unmetSkills.includes((s.name || s).toString().toLowerCase().replace(/\s+/g, '_')));
        }

        const aiQs = await generateQuestions({ targetSkills, courseId: profile.course_id, examType: 'postcourse' });
        // Select two diverse written questions
        const written = pickRandom(aiQs.filter(q => q.type === 'written'), 2);
        const challenge = await fetchDevLabChallenge({ skill: 'javascript' });
        const questions = [
            ...written,
            { id: 'devlab_code', type: 'devlab', title: challenge.title, prompt: challenge.prompt, examples: challenge.examples, starter_code: challenge.starter_code, tests: challenge.tests },
        ];

        // AI validation/audit gate (best-effort)
        try {
            if (typeof auditRetakeExam === 'function') {
                await auditRetakeExam({ userId, unmetSkills: unmetSkills || null, questions });
            }
        } catch (_) {}

        const returnUrl = (req?.query?.return) || (req?.headers?.['x-return-url']) || undefined;
        const attemptNumber = attempts_used + 1;
        const version = attemptNumber; // simple versioning aligned to attempt
        const examSkills = Array.from(new Set(questions.map(q => q.skill).filter(Boolean)));
        const allTargetSkillKeys = Array.from(new Set(targetSkills.map(s => (s.name || s).toString().toLowerCase().replace(/\s+/g, '_'))));
        const excludedSkills = allTargetSkillKeys.filter(sk => !examSkills.includes(sk));
        res.json({
            exam_id: 'postcourse-' + Date.now(),
            title: 'Post-Course Exam',
            duration_min: questions.length * 3,
            question_count: questions.length,
            attempt: attemptNumber,
            version,
            max_attempts: max_attempts,
            course_passing_grade,
            skill_thresholds,
            return_url: returnUrl,
            questions,
            exam_skills: examSkills,
            excluded_skills: excludedSkills,
        });
    } catch (err) {
        res.status(500).json({ error: 'server_error', message: err.message });
    }
};

const { evaluatePostCourseExam } = require('../services/postCourseEvaluator');

exports.submitPostCourseExam = async (req, res) => {
    try {
        const { exam_id, user_id, answers, questions, rubric, meta } = req.body || {};
        const userId = user_id || req.user?.sub || 'demo-user';
        const result = await evaluatePostCourseExam({ examId: exam_id, userId, questions: questions || [], answers: answers || {}, rubric, meta });

        // Compute unmet and passed skills against Directory thresholds
        const passing = await getPassingGrades({ userId, examType: 'postcourse' });
        const defaultPassing = passing?.defaultPassing ?? 75;
        const skillsThresholds = passing?.skills || {};
        const skillEntries = Object.entries(result.feedback || {});
        const unmetSkills = [];
        const passedSkills = [];
        for (const [skillKey, data] of skillEntries) {
            const key = String(skillKey).toLowerCase();
            const thr = typeof skillsThresholds[key] === 'number' ? skillsThresholds[key] : defaultPassing;
            if (Number(data?.score || 0) >= thr) passedSkills.push(key); else unmetSkills.push(key);
        }

        const requires_retake = (result.score_total ?? 0) < (await getUserExamConfig(userId, 'postcourse')).course_passing_grade;

        // Record attempt locally for artifacts/versioning
        try { recordAttempt({ userId, examType: 'postcourse', result: { final: { grade: result.score_total, passed: result.passed } } }); } catch (_) {}

        await incrementAttempt({ userId, examType: 'postcourse', examId: exam_id, score: result.score_total ?? result.score, passed: result.passed });
        const attempt_info = await getAttempts({ userId, examType: 'postcourse' });
        // Persist summary for next build
        saveResult({
            userId,
            attempt: attempt_info.attempts,
            max_attempts: attempt_info.maxAttempts,
            final_grade: result.score_total ?? 0,
            requires_retake,
            unmet_skills: unmetSkills,
            passed_skills: passedSkills,
            course_passing_grade: (await getUserExamConfig(userId, 'postcourse')).course_passing_grade,
            version: attempt_info.attempts,
        });
        res.json({ ...result, attempt_info, requires_retake, unmet_skills: unmetSkills, passed_skills: passedSkills });
    } catch (err) {
        res.status(500).json({ error: 'server_error', message: err.message });
    }
};


