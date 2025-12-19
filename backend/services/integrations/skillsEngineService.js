// Phase 08.5c – Delegates to gateway; no axios/env here
const { safePushAssessmentResults } = require('../gateways/skillsEngineGateway');
const { sendToCoordinator } = require('./envelopeSender');
const examsService = require('../core/examsService');

exports.sendResultsToSkillsEngine = async (payloadObj) => {
  return await safePushAssessmentResults(payloadObj || {});
};

// Fire-and-forget sender for result envelopes; logs failures only
exports.sendResultsAsync = (payloadObj) => {
  try {
    setImmediate(() => {
      sendToCoordinator({ targetService: 'skills-engine', payload: payloadObj || {} })
        .catch((e) => { try { console.warn('[SKILLS_ENGINE][ASYNC_PUSH][ERROR]', e?.message || e); } catch {} });
    });
  } catch {}
};

// Phase 09 – Inbound handler for Skills Engine
exports.handleInbound = async (payload) => {
  const action = String(payload?.action || '').toLowerCase();
  if (action !== 'start-baseline-exam') {
    return { error: 'unsupported_action' };
  }

  // Extract skills from competencies → mgs (not strictly required for createExam, but parsed for completeness)
  const competencies = Array.isArray(payload?.competencies) ? payload.competencies : [];
  const extractedSkills = [];
  for (const comp of competencies) {
    const mgs = Array.isArray(comp?.mgs) ? comp.mgs : [];
    for (const s of mgs) {
      const sid = String(s?.skill_id || '').trim();
      const sname = String(s?.skill_name || '').trim();
      if (sid) extractedSkills.push({ skill_id: sid, skill_name: sname || sid });
    }
  }

  // Create baseline exam (internal service handles policy, persistence, Mongo package)
  const user_id = payload?.user_id;
  const user_name = payload?.user_name || null;
  const company_id = payload?.company_id ?? null;

  // Start creation immediately
  const creationPromise = examsService.createExam({ user_id, user_name, company_id, exam_type: 'baseline' });

  // Race with a short timeout to avoid Coordinator timeouts; if it takes too long, acknowledge and continue in background
  const timeoutMs = Number.isFinite(Number(process.env.INTEGRATION_INBOUND_TIMEOUT_MS))
    ? Number(process.env.INTEGRATION_INBOUND_TIMEOUT_MS)
    : 5000;

  const result = await Promise.race([
    creationPromise.then((created) => ({ done: true, created })).catch((e) => ({ done: true, error: e })),
    new Promise((resolve) => setTimeout(() => resolve({ done: false }), timeoutMs)),
  ]);

  if (result.done) {
    const created = result.created || {};
    return {
      status: 'baseline-created',
      exam_type: 'baseline',
      exam_id: created?.exam_id ?? null,
      user_id: user_id ?? null,
      redirect_to: '/app/profile',
    };
  }

  // Continue in background; attach logging
  creationPromise
    .then((created) => {
      try {
        // eslint-disable-next-line no-console
        console.log('[TRACE][BASELINE][CREATE][ASYNC_DONE]', { exam_id: created?.exam_id, attempt_id: created?.attempt_id, user_id });
      } catch {}
    })
    .catch((e) => {
      try {
        // eslint-disable-next-line no-console
        console.error('[TRACE][BASELINE][CREATE][ASYNC_ERROR]', e?.message || e);
      } catch {}
    });

  // Immediate acknowledgement to prevent upstream 30s timeouts
  return {
    status: 'accepted',
    exam_type: 'baseline',
    user_id: user_id ?? null,
    message: 'Exam creation in progress',
  };
};

