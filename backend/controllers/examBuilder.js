const fs = require('fs');
const path = require('path');
const { getPolicy, getLearnerProfile } = require('../services/integrations/directory');
const { getSkillTargets } = require('../services/integrations/skillsEngine');
const { fetchDevLabChallenge } = require('../services/integrations/devLab');
const { generateQuestions } = require('../services/ai/questionGenerator');

async function buildBaselineExam(userId, req) {
	const timestamp = new Date().toISOString();

    // Baseline attempts are not enforced

	// 1️⃣ Fetch policy (passing grade only)
	const policy = await getPolicy();
	const passingGrade = policy.passing_grade || 70;

	// 2️⃣ Fetch learner profile and target skills
	const profile = await getLearnerProfile(userId);
	const targetSkills = await getSkillTargets(profile);

	// 3️⃣ Generate AI questions per target skill
	const aiQuestions = await generateQuestions({ targetSkills, courseId: profile.course_id, examType: 'baseline' });

	// 4️⃣ Append one DevLab challenge aligned to a programming skill (fallback to javascript)
	const devlab = await fetchDevLabChallenge({ skill: 'javascript' });
	const questions = [...aiQuestions, { id: 'devlab_code', type: 'devlab', title: devlab.title, prompt: devlab.prompt, examples: devlab.examples, starter_code: devlab.starter_code, tests: devlab.tests }];

	// 5️⃣ Compute duration dynamically (3 min per question)
	const durationMin = questions.length * 3;

	// 6️⃣ Assemble package
	const returnUrl = (req?.query?.return) || (req?.headers?.['x-return-url']) || undefined;
    const examPackage = {
		exam_id: `baseline-${Date.now()}`,
		user_id: userId,
		timestamp,
		type: 'baseline',
		passing_grade: passingGrade,
		duration_min: durationMin,
		question_count: questions.length,
		return_url: returnUrl,
        requires_retake: false,
		questions,
	};

    // Ensure no attempt-related fields are present in payload (defensive)
    delete examPackage.attempt;
    delete examPackage.max_attempts;
    delete examPackage.attempt_info;
    if (examPackage.policy) {
        delete examPackage.policy.max_attempts;
        delete examPackage.policy.retry_cooldown_hours;
        delete examPackage.policy.attempts_used;
    }

	// 7️⃣ Save trace to artifacts (append-only) under a writable temp directory in containers
	const os = require('os');
	const artifactDir = path.join(os.tmpdir(), 'artifacts', 'ai-generation');
	if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
	fs.writeFileSync(
		path.join(artifactDir, 'baseline-exam-build.json'),
		JSON.stringify({ meta: { userId, timestamp, question_count: questions.length }, exam_id: examPackage.exam_id }, null, 2)
	);

	return { status: 200, body: examPackage };
}

module.exports = { buildBaselineExam };


