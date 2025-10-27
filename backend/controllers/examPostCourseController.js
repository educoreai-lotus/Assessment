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

function normalizeSkillKey(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s_\-\.]/g, '')
        .replace(/\s+/g, '_');
}

async function assembleExamForSkills({ skillsKeys, targetSkills, courseId }) {
    // Map normalized keys back to target skill objects
    const targets = (targetSkills || []).filter((s) => skillsKeys.includes(normalizeSkillKey(s.name || s.id || s)));
    const qs = await generateQuestions({ targetSkills: targets, courseId, examType: 'postcourse' });
    // Debug log to verify non-empty generation
    try { console.log('[postcourse] assembleExamForSkills', { skills: skillsKeys, generated_count: Array.isArray(qs) ? qs.length : 0 }); } catch (_) {}
    return Array.isArray(qs) ? qs : [];
}

exports.buildPostCourseExam = async (req, res) => {
    try { console.log('✅ buildPostCourseExam hit'); } catch (_) {}
    try {
        const userId = req.headers['x-user-id'] || req.user?.id || req.user?.sub || 'demo';
        const examConfig = await getUserExamConfig(userId, 'postcourse');
        const coursePolicy = await require('../services/directoryPolicy').getPostCoursePolicy({ userId });
        const effectivePolicy = {
            passing_grade: examConfig.course_passing_grade ?? coursePolicy.passing_grade,
            max_attempts: examConfig.max_attempts ?? coursePolicy.max_attempts,
            retry_cooldown_hours: coursePolicy.retry_cooldown_hours,
            attempts_used: examConfig.attempts_used ?? 0,
            skill_thresholds: examConfig.skill_thresholds ?? {},
        };
        try { console.log('[PostCourseBuild] Directory-configured max_attempts:', effectivePolicy.max_attempts); } catch (_) {}
        const { max_attempts, passing_grade: course_passing_grade, skill_thresholds } = effectivePolicy;
        const attemptInfo = await getAttempts({ userId, examType: 'postcourse' });
        const attempts_used = attemptInfo.attempts;
        if (attempts_used >= max_attempts) {
            return res.status(403).json({ error: 'POSTCOURSE_LOCKED', message: 'No remaining attempts.' });
        }

        // Debug: confirm Directory mock load
        try { console.log('[postcourse] directory_config', { userId, max_attempts, course_passing_grade, has_skill_thresholds: !!(skill_thresholds && Object.keys(skill_thresholds).length) }); } catch (_) {}

        // Determine unmet skills from last saved result if any
        let unmetSkills = null;
        const last = getLastAttempt(userId);
        if (last && last.requires_retake && (last.unmet_skills || []).length) {
            unmetSkills = last.unmet_skills;
        }

        const profile = await getLearnerProfile(userId);
        const allTargetSkills = await getSkillTargets(profile);
        const allSkillKeys = allTargetSkills.map((s) => normalizeSkillKey(s.name || s.id || s));
        const isRetake = Array.isArray(unmetSkills) && unmetSkills.length > 0;
        const skillsForExam = isRetake ? unmetSkills.map(normalizeSkillKey) : allSkillKeys;

        // Generate questions for desired skills
        let aiQs = await assembleExamForSkills({ skillsKeys: skillsForExam, targetSkills: allTargetSkills, courseId: profile.course_id });
        // Fallback to full set if generation is empty for retake
        if (!Array.isArray(aiQs) || aiQs.length === 0) {
            aiQs = await assembleExamForSkills({ skillsKeys: allSkillKeys, targetSkills: allTargetSkills, courseId: profile.course_id });
        }
        // Select two diverse written questions (or take all written if fewer)
        const writtenPool = Array.isArray(aiQs) ? aiQs.filter(q => q && q.type === 'written') : [];
        const written = writtenPool.length <= 2 ? writtenPool : pickRandom(writtenPool, 2);
        const challenge = await fetchDevLabChallenge({ skill: 'javascript' });
        const devlabSkill = skillsForExam[0] || 'general';
        const questions = [
            ...written,
            { id: 'devlab_code', type: 'devlab', skill: devlabSkill, title: challenge.title, prompt: challenge.prompt, examples: challenge.examples, starter_code: challenge.starter_code, tests: challenge.tests },
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
        const examSkills = Array.from(new Set(skillsForExam));
        const excludedSkills = isRetake ? Array.from(new Set(allSkillKeys.filter(sk => !examSkills.includes(sk)))) : [];
        res.json({
            exam_id: 'postcourse-' + Date.now(),
            title: 'Post-Course Exam',
            duration_min: questions.length * 3,
            question_count: questions.length,
            attempt: attemptNumber,
            version,
            max_attempts: effectivePolicy.max_attempts,
            course_passing_grade,
            skill_thresholds,
            return_url: returnUrl,
            questions,
            exam_skills: examSkills,
            excluded_skills: excludedSkills,
            policy: effectivePolicy,
        });
    } catch (err) {
        res.status(500).json({ error: 'server_error', message: err.message });
    }
};

const { evaluatePostCourseExam } = require('../services/postCourseEvaluator');

exports.submitPostCourseExam = async (req, res) => {
    try { console.log('✅ submitPostCourseExam hit'); } catch (_) {}
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
        const attempt_raw = await getAttempts({ userId, examType: 'postcourse' });
        const examConfig = await getUserExamConfig(userId, 'postcourse');
        const maxAttempts = Number(examConfig?.max_attempts ?? attempt_raw.maxAttempts ?? 3);
        try { console.log('[PostCourseEvaluator] Using Directory config maxAttempts:', maxAttempts); } catch (_) {}
        const attempt_info = { attempts: attempt_raw.attempts, maxAttempts };
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


