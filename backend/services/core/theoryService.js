// Theory service utilities: normalize and validate theoretical questions.
// Ensures prompt.options exists and prompt.correct_answer is a member of options.

function normalizeAiQuestion(q) {
  const questionText = q?.question || q?.stem || '';
  const options =
    Array.isArray(q?.options) ? q.options :
    Array.isArray(q?.prompt?.options) ? q.prompt.options :
    Array.isArray(q?.choices) ? q.choices : [];
  const correct = q?.correct_answer || q?.prompt?.correct_answer || '';
  return {
    qid: q?.qid || q?.question_id || q?.id || '',
    type: (q?.type === 'open') ? 'open' : 'mcq',
    skill_id: q?.skill_id,
    difficulty: 'medium',
    // Pass prompt-friendly fields so ExamPackage.prompt holds options and correct_answer
    options,
    question: questionText,
    stem: questionText,
    correct_answer: correct,
  };
}

function validateTheoreticalQuestions(input) {
  const out = [];
  for (const q of input || []) {
    const options =
      Array.isArray(q?.options) ? q.options :
      Array.isArray(q?.prompt?.options) ? q.prompt.options : [];
    const ca = q?.correct_answer || q?.prompt?.correct_answer || '';
    let fixedCA = ca;
    if (Array.isArray(options) && options.length > 0 && !options.includes(ca)) {
      fixedCA = options[0];
      try {
        // eslint-disable-next-line no-console
        console.log('[THEORY][MOCK][FIX]', { reason: 'invalid_correct_answer', set_to: fixedCA });
      } catch {}
    }
    out.push({ ...q, correct_answer: fixedCA });
  }
  return out;
}

module.exports = { normalizeAiQuestion, validateTheoreticalQuestions };


