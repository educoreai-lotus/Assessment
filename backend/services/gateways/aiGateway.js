const axios = require('axios');

function getOpenAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const temperature = Number(process.env.AI_TEMPERATURE || 0.2);
  return { apiKey, model, temperature };
}

async function callOpenAiChat({ system, user, json = true }) {
  const { apiKey, model, temperature } = getOpenAiConfig();
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const body = {
    model,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: json ? { type: 'json_object' } : undefined,
  };
  const { data } = await axios.post('https://api.openai.com/v1/chat/completions', body, { headers, timeout: 60000 });
  const content = data?.choices?.[0]?.message?.content || '';
  return content;
}

function buildTheoreticalGenPrompt({ items, seed }) {
  // items: array of { skill_id, difficulty, humanLanguage, type? }
  const system = `
You are an expert assessment designer creating high-stakes examination questions.

Your goal is to generate original theoretical questions that:
- Cannot be answered by copy-pasting from documentation or search engines
- Require reasoning, judgment, or applied understanding
- Reflect how a real human thinks and explains concepts under exam conditions

Rules:
- Difficulty is ALWAYS medium.
- Questions must be realistic and professional.
- Avoid trivia, definitions, or rote memory.
- Avoid "what is X" or "define X" questions.
- Focus on scenarios, trade-offs, decision-making, and consequences.
- Do NOT include any HTML or markdown.

Per-skill enforcement (CRITICAL):
- For EACH input item, generate exactly ONE question that targets ONLY that item's skill.
- If item.skill_name is present, the question MUST explicitly involve that named concept (e.g., "React useEffect", "SQL JOINs").
- The question MUST be technical and concrete; NO managerial, business, or generic scenarios.
- The question MUST be impossible to answer without knowing the target skill.
- The output question MUST set "skill_id" equal to the item's "skill_id" verbatim.
- If type is "mcq", produce 4 plausible options with exactly one correct answer.

Output STRICT JSON only:
{
  "questions": [
    {
      "qid": "string",
      "type": "mcq" | "open",
      "stem": "string",
      "skill_id": "string",
      "difficulty": "medium",
      "options": ["string"],
      "correct_answer": "string",
      "explanation": "string",
      "hint": "string"
    }
  ]
}

Hints:
- Must guide thinking, not reveal answers.
- Explanations justify correctness, concisely.
`;
  const user = JSON.stringify({
    intent: 'generate_theoretical_questions',
    policy: {
      difficulty_policy: 'always medium for exams',
      type_mix: 'mcq or open as specified; if unspecified, choose reasonably',
      per_skill: 'one question per item; strictly focused on the item.skill_id/skill_name',
      forbid_generic: true,
      forbid_business_nontechnical: true
    },
    items,
    seed,
  });
  return { system, user };
}

async function generateTheoreticalQuestions({ items, seed }) {
  const { system, user } = buildTheoreticalGenPrompt({ items, seed });
  const content = await callOpenAiChat({ system, user, json: true });
  let parsed = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { questions: [] };
  }
  const arr = Array.isArray(parsed?.questions) ? parsed.questions : [];
  return arr.map((q, idx) => {
    const type = String(q?.type || '').toLowerCase() === 'open' ? 'open' : 'mcq';
    return {
      qid: String(q?.qid || `q_${idx + 1}`),
      type,
      stem: String(q?.stem || ''),
      skill_id: String(q?.skill_id || ''),
      // Enforce exam policy: theoretical questions are always medium
      difficulty: 'medium',
      options: Array.isArray(q?.options) ? q.options.map(String) : (type === 'mcq' ? [] : undefined),
      correct_answer: q?.correct_answer != null ? String(q.correct_answer) : '',
      explanation: q?.explanation != null ? String(q.explanation) : '',
      hint: q?.hint != null ? String(q.hint) : '',
    };
  });
}

function buildValidationPrompt({ question }) {
  const system = `
You are an assessment quality reviewer. Validate the following exam question.

Criteria:
- Clarity (unambiguous wording)
- Fairness (no trick wording)
- Skill relevance
- Medium difficulty
- No hallucinated or false assumptions
- Appropriate for a real exam

Return STRICT JSON only:
{
  "valid": boolean,
  "reasons": ["string"]
}
`;
  const user = JSON.stringify({
    intent: 'validate_question',
    question,
    criteria: ['clarity', 'ambiguity', 'domain_knowledge', 'distractors', 'difficulty', 'skill_alignment'],
  });
  return { system, user };
}

async function validateQuestion({ question }) {
  const { system, user } = buildValidationPrompt({ question });
  const content = await callOpenAiChat({ system, user, json: true });
  let parsed = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { valid: false, reasons: ['invalid_json'] };
  }
  const valid = !!parsed?.valid;
  const reasons = Array.isArray(parsed?.reasons) ? parsed.reasons.map(String) : [];
  return { valid, reasons };
}

// --- Semantic grading for open-ended answers (exam) ---
async function gradeOpenAnswerSemantically(question, studentAnswer) {
  // Use model with json:true
  const system = `
You are an examiner grading a high-stakes theoretical exam.

Evaluate the student's answer based on:
- Conceptual correctness
- Depth of understanding
- Logical reasoning
- Clarity of explanation
- Alignment with the question intent

Rules:
- Do NOT expect perfect wording.
- Partial understanding earns partial credit.
- Guessing or vague answers score low.
- Reason like a human examiner.

Return STRICT JSON only:
{
  "score": number (0-100),
  "reason": "string"
}
`;
  const qText =
    typeof question === 'string'
      ? question
      : (String(question?.stem || question?.question || ''));
  const expected =
    (question && typeof question === 'object' && question?.correct_answer != null)
      ? String(question.correct_answer)
      : '';
  const user = JSON.stringify({
    question: qText,
    expected_answer: expected,
    student_answer: studentAnswer != null ? String(studentAnswer) : '',
  });
  return await callOpenAiChat({ system, user, json:true });
}

async function generateDevLabTheoreticalQuestions(params) {
  const system = `You generate structured theoretical questions for an interactive learning platform.

Output strict JSON: { "questions": [...] }.

Each question must include:
id, type, stem, skill_id, difficulty, options (if mcq), correct_answer, explanation, hints(3).

User difficulty MUST cycle automatically: easy → medium → hard → expert → repeat.

NO HTML. NO markdown.`;
  const amount = Number(params?.amount || 1);
  const user = JSON.stringify({
    intent: 'generate_devlab_theoretical',
    topic_id: String(params?.topic_id || ''),
    topic_name: String(params?.topic_name || ''),
    skills: Array.isArray(params?.skills) ? params.skills.map(String) : [],
    amount,
    question_type: params?.question_type ? String(params.question_type) : undefined,
    humanLanguage: String(params?.humanLanguage || 'en'),
  });
  const content = await callOpenAiChat({ system, user, json: true });
  let parsed = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { questions: [] };
  }
  const arr = Array.isArray(parsed?.questions) ? parsed.questions : [];
  // Return only parsed JSON questions array
  return arr;
}

// --- Per-skill feedback generation ---
async function generateSkillFeedback({ skill_id, score, humanLanguage = 'en' }) {
  const system = `
You are a professional examiner providing feedback to a learner.
Based on the learner’s performance on this skill:
- Explain what they understood well
- Explain what was missing or incorrect
- Suggest how to improve
- Keep tone respectful, encouraging, and clear

Rules:
- Speak as a human examiner
- No generic phrases
- No grading jargon
- No emojis

Return STRICT JSON only:
{ "feedback": "string" }
`;
  const user = JSON.stringify({
    intent: 'skill_feedback',
    skill_id: String(skill_id || ''),
    score: Number(score || 0),
    humanLanguage,
  });
  const content = await callOpenAiChat({ system, user, json: true });
  let parsed = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { feedback: '' };
  }
  return parsed;
}

module.exports = {
  generateTheoreticalQuestions,
  validateQuestion,
  gradeOpenAnswerSemantically,
  generateDevLabTheoreticalQuestions,
  generateSkillFeedback,
};


