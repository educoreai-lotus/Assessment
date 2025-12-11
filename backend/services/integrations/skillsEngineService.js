// Phase 08.5c – Delegates to gateway; no axios/env here
const { safePushAssessmentResults } = require('../gateways/skillsEngineGateway');
const examsService = require('../core/examsService');

exports.sendResultsToSkillsEngine = async (payloadObj) => {
  return await safePushAssessmentResults(payloadObj || {});
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
  const created = await examsService.createExam({ user_id, exam_type: 'baseline' });

  // Build response
  return {
    status: 'baseline-created',
    exam_type: 'baseline',
    exam_id: created?.exam_id ?? null,
    user_id: user_id ?? null,
    redirect_to: '/app/profile', // placeholder
  };
};

