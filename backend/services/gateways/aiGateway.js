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

function buildTheoreticalGenPrompt({ items }) {
  // items: array of { skill_id, difficulty, humanLanguage, type? }
  const system = [
    'You generate assessment questions.',
    'Output strictly as JSON with { "questions": [ ... ] }.',
    'Each question must include: qid, type ("mcq" or "open"), stem, skill_id, difficulty (easy|medium|hard), options (array; only for mcq), correct_answer (string), explanation (string), hint (string).',
    'Hints MUST NOT reveal the exact correct answer. Explanations can justify correctness, but keep concise.',
    'Do not include any HTML or markdown in fields.',
  ].join(' ');
  const user = JSON.stringify({
    intent: 'generate_theoretical_questions',
    policy: {
      difficulty_policy: 'respect requested difficulty per item',
      type_mix: 'mcq or open as specified; if unspecified, choose reasonably',
    },
    items,
  });
  return { system, user };
}

async function generateTheoreticalQuestions({ items }) {
  const { system, user } = buildTheoreticalGenPrompt({ items });
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
      difficulty: String(q?.difficulty || 'medium'),
      options: Array.isArray(q?.options) ? q.options.map(String) : (type === 'mcq' ? [] : undefined),
      correct_answer: q?.correct_answer != null ? String(q.correct_answer) : '',
      explanation: q?.explanation != null ? String(q.explanation) : '',
      hint: q?.hint != null ? String(q.hint) : '',
    };
  });
}

function buildValidationPrompt({ question }) {
  const system = [
    'You validate assessment questions for quality gates.',
    'Return strict JSON { "valid": boolean, "reasons": string[] }.',
    'Criteria: clarity, fairness, no hallucination, difficulty matches requested, skill_id relevance.',
  ].join(' ');
  const user = JSON.stringify({
    intent: 'validate_question',
    question,
    criteria: ['clarity', 'fairness', 'no_hallucination', 'difficulty_match', 'skill_relevance'],
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

module.exports = {
  generateTheoreticalQuestions,
  validateQuestion,
};


