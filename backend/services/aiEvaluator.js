const OpenAI = require('openai');

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const AI_TEMPERATURE = Number(process.env.AI_TEMPERATURE || 0.2);

function getOpenAIClient() {
    if (AI_PROVIDER !== 'openai') return null;
    if (!OPENAI_API_KEY) return null;
    try {
        return new OpenAI({ apiKey: OPENAI_API_KEY });
    } catch (_) {
        return null;
    }
}

function coerceString(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    try { return String(value); } catch (_) { return ''; }
}

function safeJsonParse(text) {
    try { return JSON.parse(text); } catch (_) { return null; }
}

function validateAiQuestion(item, defaults = {}) {
    const out = {
        id: coerceString(item?.id || defaults.id || `ai-${Date.now()}`),
        type: coerceString(item?.type || defaults.type || 'theoretical'),
        source: 'AI',
        skill: coerceString(item?.skill || defaults.skill || 'General'),
        topic: item?.topic ? coerceString(item.topic) : undefined,
        question: coerceString(item?.question || defaults.question || ''),
        choices: Array.isArray(item?.choices) ? item.choices.map(coerceString) : undefined,
        correct_answer: coerceString(item?.correct_answer || ''),
    };
    // Back-compat for frontend expecting options/expected_answer
    if (out.choices) out.options = out.choices.slice();
    if (out.correct_answer) out.expected_answer = out.correct_answer;
    return out;
}

async function generateQuestionsForSkill(skill) {
    const client = getOpenAIClient();
    const skillName = coerceString(skill?.name || skill);
    if (!client) {
        // Fallback deterministic question if AI is not configured
        return [validateAiQuestion({
            id: `ai-${coerceString(skill?.id || skillName).toLowerCase()}`,
            type: 'theoretical',
            skill: skillName,
            question: `Which option best describes ${skillName}?`,
            choices: ['A', 'B', 'C', 'D'],
            correct_answer: 'A',
        })];
    }
    const system = 'You are an assessment generator. Output strict JSON only.';
    const user = `Create exactly 1 multiple-choice question for the skill: "${skillName}".
Return strict JSON with this shape:
{
  "questions": [
    {
      "id": string,
      "type": "theoretical",
      "source": "AI",
      "skill": string,
      "question": string,
      "choices": [string, string, string, string],
      "correct_answer": string // must be one of choices
    }
  ]
}`;
    const resp = await client.chat.completions.create({
        model: AI_MODEL,
        temperature: AI_TEMPERATURE,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
    });
    const content = coerceString(resp?.choices?.[0]?.message?.content);
    const json = safeJsonParse(content) || {};
    const items = Array.isArray(json.questions) ? json.questions : [];
    if (!items.length) {
        return [validateAiQuestion({
            id: `ai-${coerceString(skill?.id || skillName).toLowerCase()}`,
            type: 'theoretical',
            skill: skillName,
            question: `What is a key concept of ${skillName}?`,
            choices: ['A', 'B', 'C', 'D'],
            correct_answer: 'A',
        })];
    }
    return items.map((q, i) => validateAiQuestion(q, { id: `ai-${coerceString(skill?.id || skillName)}-${i+1}`, skill: skillName, type: 'theoretical' }));
}

async function generateQuestionsForTopics(topicName, skills) {
    const items = [];
    for (const s of (skills || [])) {
        const perSkill = await generateQuestionsForSkill({ id: coerceString(s).toLowerCase().replace(/\s+/g, '-'), name: coerceString(s) });
        items.push(...perSkill.map(q => ({ ...q, topic: coerceString(topicName) })));
    }
    return items;
}

function aggregateBySkill(questions, answers, passingGrade) {
    const stats = new Map();
    for (const q of (questions || [])) {
        const skill = q.skill || 'General';
        const actual = coerceString((answers || {})[q.id]);
        const expected = coerceString(q.correct_answer || q.expected_answer || '');
        let score = 0;
        if (expected && actual) {
            score = actual.trim().toLowerCase() === expected.trim().toLowerCase() ? 100 : 60;
        } else if (actual) {
            score = 60;
        }
        if (!stats.has(skill)) stats.set(skill, { total: 0, count: 0 });
        const s = stats.get(skill);
        s.total += score; s.count += 1;
    }
    const aiFeedback = [];
    let total = 0; let count = 0;
    for (const [skill, { total: t, count: c }] of stats.entries()) {
        const avg = c ? Math.round(t / c) : 0;
        aiFeedback.push({ skill, score: avg, passed: avg >= passingGrade });
        total += t; count += c;
    }
    const finalGrade = count ? Math.round(total / count) : 0;
    return { aiFeedback, finalGrade };
}

async function evaluateSubmission({ questions, answers, passingGrade }) {
    const client = getOpenAIClient();
    if (!client) {
        const { aiFeedback, finalGrade } = aggregateBySkill(questions, answers, passingGrade || 70);
        const summary = finalGrade >= (passingGrade || 70) ? 'Passed' : 'Failed';
        return { ai_feedback: aiFeedback, final_grade: finalGrade, summary };
    }
    const system = 'You are an exam evaluator. Output strict JSON only.';
    const payload = { questions: (questions || []).map(q => ({ id: q.id, skill: q.skill || 'General', correct_answer: q.correct_answer || q.expected_answer || null })), answers: answers || {}, passing_grade: passingGrade || 70 };
    const user = `Given the questions (with optional correct_answer) and user answers, evaluate per skill.
Rules:
- If correct_answer exists and matches answer, score 100 for that question; else 60.
- Aggregate average per skill (0-100), mark passed if >= passing_grade.
- Compute final_grade as average across all questions (0-100), round to int.
Return JSON:
{
  "ai_feedback": [{"skill": string, "score": number, "passed": boolean}],
  "final_grade": number,
  "summary": string
}

Input JSON:
${JSON.stringify(payload)}`;
    const resp = await client.chat.completions.create({
        model: AI_MODEL,
        temperature: AI_TEMPERATURE,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
    });
    const content = coerceString(resp?.choices?.[0]?.message?.content);
    const json = safeJsonParse(content) || {};
    const aiFeedback = Array.isArray(json.ai_feedback) ? json.ai_feedback : [];
    const finalGrade = typeof json.final_grade === 'number' ? Math.round(json.final_grade) : 0;
    const summary = coerceString(json.summary || (finalGrade >= (passingGrade || 70) ? 'Passed' : 'Failed'));
    return { ai_feedback: aiFeedback, final_grade: finalGrade, summary };
}

const fs = require('fs');
const path = require('path');
const { recordAttempt, setCooldown } = require('./attemptTracker');
const { getPassingPolicy } = require('./integrations/directory');

async function evaluatePostCourseExam(answers, questions, { userId = 'demo-user' } = {}) {
    const policy = await getPassingPolicy();
    const passingGrade = policy.passing_grade || 70;
    const result = await evaluateSubmission({ questions, answers, passingGrade });
    // Persist feedback artifact (append-only best-effort)
    try {
        const outDir = path.join(process.cwd(), 'artifacts/ai-evaluation');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'post-course-feedback.json'), JSON.stringify(result, null, 2));
    } catch (_) {}

    // Record attempt and versioning
    const { version } = recordAttempt({ userId, examType: 'post-course', result });

    // If failed, generate retake set focused on weak skills
    if (result.final_grade < passingGrade) {
        const failedSkills = (result.ai_feedback || []).filter((f) => !f.passed).map((f) => f.skill);
        const retakeQs = [];
        for (const s of failedSkills) {
            // eslint-disable-next-line no-await-in-loop
            const per = await generateQuestionsForSkill({ id: String(s).toLowerCase().replace(/\s+/g, '-'), name: s });
            retakeQs.push(...per);
        }
        const outDir = path.join(process.cwd(), 'artifacts/ai-generation');
        try {
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
            fs.writeFileSync(path.join(outDir, 'retake-exam.json'), JSON.stringify({ version: version + 1, userId, failedSkills, questions: retakeQs }, null, 2));
        } catch (_) {}
        // 24h cooldown by policy (retry_cooldown_hours default 24)
        const hours = Number(policy.retry_cooldown_hours || 24);
        const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        setCooldown({ userId, examType: 'post-course', until });
    }
    return { ...result, version };
}

module.exports = { generateQuestionsForSkill, generateQuestionsForTopics, evaluateSubmission, evaluatePostCourseExam };


