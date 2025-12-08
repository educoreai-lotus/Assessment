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
  const { data } = await axios.post('https://api.openai.com/v1/chat/completions', body, { headers, timeout: 30000 });
  const content = data?.choices?.[0]?.message?.content || '';
  return content;
}

function buildTheoreticalGenPrompt({ items, seed }) {
  // items: array of { skill_id, difficulty, humanLanguage, type? }
  const system = `
You are a professional assessment question generator specializing in high-stakes exams.
You produce *medium difficulty*, *scenario-based*, *skill-aligned*, *non-trivial* theoretical questions.

Your output MUST be STRICT JSON:
{
  "questions": [ ... ]
}

Each question MUST include:
- qid (string)
- type ("mcq" or "open")
- stem (string)
- options (array for mcq)
- correct_answer (string)
- explanation (string)
- skill_id (string)
- difficulty ("medium")
- hint (string) — subtle guidance only, never reveal the correct answer.

Rules:
- Never output HTML or markdown.
- Never produce trivial or factual questions.
- Always tie the question to a realistic scenario.
- MCQ must have 1 correct option only.
- OPEN questions must require reasoning.
- Language must be formal and clear.
`;
  const user = JSON.stringify({
    intent: 'generate_theoretical_questions',
    policy: {
      difficulty_policy: 'always medium for exams',
      type_mix: 'mcq or open as specified; if unspecified, choose reasonably',
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
You validate high-stakes theoretical exam questions.
Return STRICT JSON:
{
  "valid": boolean,
  "reasons": [string]
}

Reasons may include:
- unclear wording
- ambiguous options
- incorrect domain knowledge
- weak distractors
- difficulty mismatch
- irrelevant skill alignment

Be strict. If a question would fail a real certification exam review, mark it invalid.
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
You are a semantic grading engine for open-ended exam answers.
Output STRICT JSON:
{ "score": number, "reason": string }

Scoring rubric:
- 100 = fully correct and well-reasoned
- 70–90 = mostly correct with minor gaps
- 40–60 = partially correct
- 10–30 = major gaps, shallow reasoning
- 0 = unrelated or incorrect

Judge based on:
- conceptual correctness,
- reasoning quality,
- completeness relative to question.correct_answer.

Never reveal internal chain-of-thought.
Never apologize.
`;
  const user = JSON.stringify({
    question,
    studentAnswer,
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

module.exports = {
  generateTheoreticalQuestions,
  validateQuestion,
  gradeOpenAnswerSemantically,
  generateDevLabTheoreticalQuestions,
};


