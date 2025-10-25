const fs = require('fs');
const path = require('path');
const { getPolicy } = require('../services/integrations/directory');
const { getLearnerSkills } = require('../services/integrations/skillsEngine');
const { getDevLabQuestions } = require('../services/integrations/devLab');
const { generateQuestionsForSkill } = require('../services/aiEvaluator');
const { validateGeneratedQuestions } = require('../services/aiValidator');

async function buildBaselineExam(userId) {
	const timestamp = new Date().toISOString();

	// 1️⃣ Fetch policy (passing grade only)
	const policy = await getPolicy();
	const passingGrade = policy.passing_grade || 70;

	// 2️⃣ Fetch learner skills
	const learnerSkills = await getLearnerSkills(userId);
	if (!learnerSkills?.length) throw new Error('No skills found for user');

    // 3️⃣ Generate AI & DevLab questions per skill
	const questions = [];
	for (const skill of learnerSkills) {
	        let aiQ = await generateQuestionsForSkill(skill);
	        aiQ = await validateGeneratedQuestions(aiQ);
	        // Auto-regenerate rejected once (best-effort)
	        if (!aiQ.length) {
	            const retry = await generateQuestionsForSkill(skill);
	            aiQ = await validateGeneratedQuestions(retry);
	        }
		const devlabQ = await getDevLabQuestions(skill);
		questions.push(...aiQ, ...devlabQ);
	}

	// 4️⃣ Compute duration dynamically (3 min per question)
	const durationMin = questions.length * 3;

	// 5️⃣ Assemble package
	const examPackage = {
		exam_id: `baseline-${Date.now()}`,
		user_id: userId,
		timestamp,
		type: 'baseline',
		passing_grade: passingGrade,
		duration_min: durationMin,
		question_count: questions.length,
		questions,
	};

	// 6️⃣ Save trace to artifacts (append-only)
	const artifactDir = path.join(__dirname, '../../artifacts/ai-generation');
	if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
	fs.writeFileSync(
		path.join(artifactDir, 'baseline-exam-build.json'),
		JSON.stringify({ meta: { userId, timestamp, question_count: questions.length }, exam_id: examPackage.exam_id }, null, 2)
	);

	return examPackage;
}

module.exports = { buildBaselineExam };


