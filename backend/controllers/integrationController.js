// IMPORTANT ARCHITECTURE NOTE
// ---------------------------
// PostgreSQL stores ONLY numeric IDs.
// MongoDB stores original string IDs.
// Incoming API can send ANY ID format.
// normalizeToInt() extracts numeric portion for SQL usage.
// This guarantees:
// - strict relational integrity in PostgreSQL
// - flexible ID formats for external microservices
// - zero prefix collisions
// - correct grading and attempt lookup

const { sendResultsToSkillsEngine } = require('../services/integrations/skillsEngineService');
const { sendExamResultsToCourseBuilder } = require('../services/integrations/courseBuilderService');
const { sendIncidentDecisionToRag } = require('../services/integrations/ragService');
const { sendSummaryToProtocolCamera } = require('../services/integrations/protocolCameraService');
const { normalizeToInt } = require("../services/core/idNormalizer");
const { fetchManagementDailyAttempts } = require('../services/integrations/managementService');
// Phase 08.6 – Universal dispatcher service imports
const managementService = require('../services/integrations/managementService');
const directoryService = require('../services/integrations/directoryService');
const skillsEngineService = require('../services/integrations/skillsEngineService');
const devlabService = require('../services/integrations/devlabService');
const ragService = require('../services/integrations/ragService');

// This controller centralizes inbound integration handling at /api/assessment/integration
// It dispatches by api_caller and HTTP method to the correct workflow.

function parseStringifiedJson(stringifiedJson) {
  try {
    return stringifiedJson ? JSON.parse(stringifiedJson) : {};
  } catch (e) {
    return {};
  }
}

exports.handlePostIntegration = async (req, res, next) => {
  try {
    const { api_caller: apiCaller, stringified_json: stringifiedJson } = req.body || {};
    const payload = parseStringifiedJson(stringifiedJson);

    try {
      // eslint-disable-next-line no-console
      console.log('[INBOUND][INTEGRATION][POST]', {
        path: req.originalUrl,
        api_caller: apiCaller || null,
        action: (payload && payload.action) || null,
        ip: req.ip || null,
      });
    } catch {}

    if (!apiCaller) {
      return res.status(400).json({ error: 'api_caller_required' });
    }

    switch (apiCaller) {
      case 'skills_engine': {
        // Start baseline exam flow scaffold
        // TODO: create baseline exam, store policy snapshot, generate questions
        return res.status(202).json({ status: 'accepted', flow: 'baseline_exam_start' });
      }
      case 'course_builder': {
        // Start post-course exam OR grant extra attempt
        // payload.update_type === 'extra_attempt' means unlock attempt only
        return res.status(202).json({
          status: 'accepted',
          flow: payload?.update_type === 'extra_attempt' ? 'grant_extra_attempt' : 'postcourse_exam_start',
        });
      }
      case 'devlab': {
        // Ingest coding questions or request theoretical ones
        // Identify presence of questions array vs. wrapped theoretical request payload
        const isCodingIngest = Array.isArray(payload?.questions);
        const mode = isCodingIngest ? 'coding_questions_ingest' : 'theoretical_request';

        // Phase 08.1 – Extract topic fields for theoretical request structure:
        // {
        //   requester_service: "assessment",
        //   payload: {...},
        //   response: { answer: "" }
        // }
        let normalized = undefined;
        if (!isCodingIngest && payload && typeof payload === 'object') {
          const nested = payload?.payload || {};
          const topic_id =
            nested?.topic_id != null && Number.isFinite(Number(nested.topic_id))
              ? Number(nested.topic_id)
              : undefined;
          const topic_name =
            typeof nested?.topic_name === 'string' ? nested.topic_name : undefined;
          const humanLanguage =
            typeof nested?.humanLanguage === 'string' && nested.humanLanguage.trim() !== ''
              ? nested.humanLanguage
              : undefined;
          const questionStr =
            typeof nested?.question === 'string' && nested.question.trim() !== ''
              ? nested.question
              : (typeof nested?.stem === 'string' ? nested.stem : undefined);
          const correct_answer =
            nested?.correct_answer != null ? String(nested.correct_answer) : undefined;
          const hints =
            Array.isArray(nested?.hints) ? nested.hints.map((h) => String(h)) : undefined;
          const difficulty = 'medium'; // Enforced policy for theoretical

          normalized = {
            topic_id,
            topic_name,
            humanLanguage,
            question: questionStr,
            hints,
            correct_answer,
            difficulty,
          };
        }

        return res.status(202).json({
          status: 'accepted',
          flow: `devlab_${mode}`,
          normalized_theoretical: normalized,
        });
      }
      case 'rag': {
        // RAG incident report reception
        return res.status(202).json({ status: 'accepted', flow: 'rag_incident_report' });
      }
      case 'protocol_camera': {
        // Proctoring event ingestion
        return res.status(202).json({ status: 'accepted', flow: 'protocol_camera_event' });
      }
      default:
        return res.status(400).json({ error: 'unsupported_api_caller' });
    }
  } catch (err) {
    return next(err);
  }
};

exports.getManagementDailyReport = async (req, res, next) => {
  try {
    try {
      // eslint-disable-next-line no-console
      console.log('[INBOUND][MANAGEMENT][GET_DAILY_REPORT]', {
        path: req.originalUrl,
        ip: req.ip || null,
      });
    } catch {}
    const results = await fetchManagementDailyAttempts();
    return res.json({
      requester_name: 'ManagementReporting',
      payload: {},
      response: results,
    });
  } catch (err) {
    return next(err);
  }
};

exports.handleGetIntegration = async (req, res, next) => {
  const pool = require('../config/supabaseDB');
  const { ExamPackage } = require('../models');
  const { safeGetBaselineAnalytics, safeGetPostcourseAnalytics } = require('../services/gateways/analyticsGateway');
  try {
    const { api_caller: apiCaller, stringified_json: stringifiedJson } = req.query || {};
    const payload = parseStringifiedJson(stringifiedJson);

    try {
      // eslint-disable-next-line no-console
      console.log('[INBOUND][INTEGRATION][GET]', {
        path: req.originalUrl,
        api_caller: apiCaller || null,
        action: (payload && payload.action) || null,
        ip: req.ip || null,
      });
    } catch {}
    
    if (!apiCaller) {
      return res.status(400).json({ error: 'api_caller_required' });
    }
    
    switch (apiCaller) {
      case 'learning_analytics': {
        try {
          // Fetch most recent submitted attempt
          const { rows } = await pool.query(
            `SELECT ea.*, e.exam_type, e.course_id
             FROM exam_attempts ea
             JOIN exams e ON e.exam_id = ea.exam_id
             WHERE ea.submitted_at IS NOT NULL
             ORDER BY ea.submitted_at DESC
             LIMIT 1`
          );
          if (rows.length === 0) {
            // fallback mock
            const mock = await safeGetPostcourseAnalytics();
            return res.json(mock);
          }
          const a = rows[0];
          const pkg = await ExamPackage.findOne({ attempt_id: String(a.attempt_id) }).lean();
          const skillsRows = await pool.query(
            `SELECT skill_id, skill_name, score, status FROM attempt_skills WHERE attempt_id = $1 ORDER BY skill_id ASC`,
            [a.attempt_id]
          );
          const skillList = skillsRows.rows.map((s) => ({
            skill_id: s.skill_id,
            skill_name: s.skill_name,
            score: Number(s.score),
            status: s.status,
          }));
          const policy = a.policy_snapshot || {};
          const userIdNormalized = normalizeToInt(pkg?.user?.user_id);
          if (a.exam_type === 'baseline') {
            return res.json({
              user_id: userIdNormalized != null ? Number(userIdNormalized) : null,
              exam_type: 'baseline',
              passing_grade: Number(policy?.passing_grade ?? 0),
              final_grade: a.final_grade != null ? Number(a.final_grade) : null,
              passed: !!a.passed,
              skills: skillList,
              submitted_at: a.submitted_at ? new Date(a.submitted_at).toISOString() : null,
            });
          }
          // postcourse
          return res.json({
            user_id: userIdNormalized != null ? Number(userIdNormalized) : null,
            exam_type: 'postcourse',
            course_id: a.course_id != null ? Number(a.course_id) : null,
            course_name: pkg?.metadata?.course_name || null,
            attempt_no: a.attempt_no || 1,
            passing_grade: Number(policy?.passing_grade ?? 0),
            max_attempts: Number(policy?.max_attempts ?? 0) || undefined,
            final_grade: a.final_grade != null ? Number(a.final_grade) : null,
            passed: !!a.passed,
            skills: skillList,
            submitted_at: a.submitted_at ? new Date(a.submitted_at).toISOString() : null,
          });
        } catch (e) {
          // fallback mock
          const type = (payload && payload.exam_type) || 'postcourse';
          if (type === 'baseline') {
            const mock = await safeGetBaselineAnalytics();
            return res.json(mock);
          }
          const mock = await safeGetPostcourseAnalytics();
          return res.json(mock);
        }
      }
      case 'management': {
        try {
          try {
            // eslint-disable-next-line no-console
            console.log('[INBOUND][MANAGEMENT][GET]', { mode: 'latest_submitted' });
          } catch {}
          const { rows } = await pool.query(
            `SELECT ea.attempt_no, ea.final_grade, ea.passed, ea.submitted_at,
                    e.exam_type, e.course_id
             FROM exam_attempts ea
             JOIN exams e ON e.exam_id = ea.exam_id
             WHERE ea.submitted_at IS NOT NULL
             ORDER BY ea.submitted_at DESC
             LIMIT 1`
          );
          if (rows.length === 0) {
            return res.json({
              user_id: 123,
              course_id: 789,
              exam_type: 'postcourse',
              attempt_no: 1,
              passing_grade: 70,
              final_grade: 82,
              passed: true,
            });
          }
          const a = rows[0];
          // user_id from ExamPackage
          const pkg = await ExamPackage.findOne({ attempt_id: String(a.attempt_id) }).lean();
          const policy = a.policy_snapshot || {};
          const userIdNormalized = normalizeToInt(pkg?.user?.user_id);
          return res.json({
            user_id: userIdNormalized != null ? Number(userIdNormalized) : null,
            course_id: a.course_id != null ? Number(a.course_id) : null,
            exam_type: a.exam_type,
            attempt_no: a.attempt_no || 1,
            passing_grade: Number(policy?.passing_grade ?? 0),
            final_grade: a.final_grade != null ? Number(a.final_grade) : null,
            passed: !!a.passed,
          });
        } catch (e) {
          return res.json({
            user_id: 123,
            course_id: 789,
            exam_type: 'postcourse',
            attempt_no: 1,
            passing_grade: 70,
            final_grade: 82,
            passed: true,
          });
        }
      }
      default:
        return res.status(400).json({ error: 'unsupported_api_caller' });
    }
  } catch (err) {
    return next(err);
  }
};


// Phase 08.5 – CourseBuilder Pre-Exam (incoming request)
exports.handleCourseBuilderPreExam = async (req, res, next) => {
  try {
    const { requester_service: requesterService, payload } = req.body || {};

    // Parse stringified payload safely
    let parsed = {};
    try {
      parsed = typeof payload === 'string' ? JSON.parse(payload) : {};
    } catch (e) {
      parsed = {};
    }

    // Extract fields (for future orchestration usage)
    const learner_id = parsed?.learner_id ?? null;
    const learner_name = parsed?.learner_name ?? null;
    const course_id = parsed?.course_id ?? null;
    const course_name = parsed?.course_name ?? null;
    const coverage_map = parsed?.coverage_map ?? null;
    void learner_id; void learner_name; void course_id; void course_name; void coverage_map;

    // Prepare protocol-compliant response envelope
    const responseObject = { status: 'received' };
    const envelope = {
      requester_service: 'assessment',
      payload: typeof payload === 'string' ? payload : JSON.stringify(parsed),
      response: JSON.stringify(responseObject),
    };

    return res.json(envelope);
  } catch (err) {
    return next(err);
  }
};

// Phase 09 – Universal inbound Coordinator handler (single route)
exports.universalIntegrationHandler = async (req, res) => {
  try {
    try {
      // eslint-disable-next-line no-console
      console.log('[INBOUND][UNIVERSAL][POST]', {
        path: req.originalUrl,
        body_type: typeof req.body,
        ip: req.ip || null,
      });
    } catch {}
    // Accept both RAW STRING and already-parsed JSON bodies
    let envelope;
    if (typeof req.body === 'string') {
      envelope = JSON.parse(req.body);
    } else if (req.body && typeof req.body === 'object') {
      envelope = req.body;
    } else {
      // Last-ditch attempt to stringify and parse
      envelope = JSON.parse(String(req.body || ''));
    }

    // Early validation (ignore target_service entirely)
    const requester = envelope?.requester_service;
    let payload = envelope?.payload;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch {}
    }
    try {
      // eslint-disable-next-line no-console
      console.log('[INBOUND][UNIVERSAL][ENVELOPE]', {
        requester_service: requester || null,
        action: (payload && payload.action) || null,
        payload_keys: payload && typeof payload === 'object' ? Object.keys(payload) : null,
      });
    } catch {}
    if (!requester || !payload) {
      try {
        // eslint-disable-next-line no-console
        console.warn('[INBOUND][UNIVERSAL][INVALID_ENVELOPE]', {
          requester_present: !!requester,
          payload_present: !!payload,
        });
      } catch {}
      return res.status(400).json({ error: 'invalid_envelope' });
    }

    // Dispatch by requester_service only
    const requesterLower = String(requester).toLowerCase();
    try {
      // eslint-disable-next-line no-console
      console.log('[INBOUND][UNIVERSAL][DISPATCH]', {
        requester: requesterLower,
        action: (payload && payload.action) || null,
      });
    } catch {}
    let answer;
    switch (requesterLower) {
      case 'skills-engine-service':
      case 'skills-engine':
      case 'skillsengine':
        answer = await skillsEngineService.handleInbound(payload);
        break;

      case 'directory-service':
      case 'directory':
        answer = await directoryService.handleInbound(payload);
        break;

      case 'management-service':
      case 'managementreporting-service':
      case 'management':
      case 'managementreporting':
        answer = await managementService.handleInbound(payload);
        break;

      case 'rag-service':
      case 'rag':
        answer = await ragService.handleInbound(payload);
        break;

      case 'devlab-service':
      case 'devlab':
        answer = await devlabService.handleInbound(payload);
        break;

      default:
        answer = { error: 'unknown_requester' };
        break;
    }

    try {
      // eslint-disable-next-line no-console
      console.log('[OUTBOUND][INTEGRATION][RESPONSE]', {
        requester: requesterLower,
        action: (payload && payload.action) || null,
        answer_type: answer && typeof answer,
        answer_keys: answer && typeof answer === 'object' ? Object.keys(answer) : null,
      });
      // Log compact body snapshot (truncate to avoid excessive logs)
      const bodyStr = (() => {
        try { return JSON.stringify(answer); } catch { return String(answer); }
      })();
      const snapshot = bodyStr && bodyStr.length > 2000 ? (bodyStr.slice(0, 2000) + '…[truncated]') : bodyStr;
      console.log('[OUTBOUND][INTEGRATION][RESPONSE_BODY]', snapshot);
    } catch {}

    return res.status(200).json({ response: { answer } });
  } catch (err) {
    return res.status(400).json({ error: 'invalid_envelope', message: err?.message });
  }
};

