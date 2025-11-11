const { sendResultsToSkillsEngine } = require('../services/integrations/skillsEngineService');
const { sendExamResultsToCourseBuilder } = require('../services/integrations/courseBuilderService');
const { sendTheoreticalToDevLab, sendCodingResultsToDevLab } = require('../services/integrations/devlabService');
const { sendIncidentDecisionToRag } = require('../services/integrations/ragService');
const { sendSummaryToProtocolCamera } = require('../services/integrations/protocolCameraService');

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
        // Identify presence of questions array vs. difficulty + skills filters
        const mode = Array.isArray(payload?.questions) ? 'coding_questions_ingest' : 'theoretical_request';
        return res.status(202).json({ status: 'accepted', flow: `devlab_${mode}` });
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

exports.handleGetIntegration = async (req, res, next) => {
  try {
    const { api_caller: apiCaller, stringified_json: stringifiedJson } = req.query || {};
    const payload = parseStringifiedJson(stringifiedJson);

    if (!apiCaller) {
      return res.status(400).json({ error: 'api_caller_required' });
    }

    switch (apiCaller) {
      case 'learning_analytics': {
        // Return summarized attempt data
        // TODO: fetch from Postgres attempt + skills with minimal fields
        return res.json({
          // Placeholder per spec; replace with real DB query results
          user_id: 'u_123',
          exam_type: 'postcourse',
          course_id: 'c_789',
          course_name: 'Intro to JS',
          attempt_no: 1,
          passing_grade: 70,
          max_attempts: 3,
          final_grade: 82,
          passed: true,
          skills: [
            { skill_id: 's_html', skill_name: 'HTML Structure', score: 85, status: 'acquired' },
            { skill_id: 's_js_async', skill_name: 'Asynchronous Programming', score: 78, status: 'acquired' },
          ],
          submitted_at: new Date().toISOString(),
        });
      }
      case 'management': {
        // Return official minimal record
        // TODO: fetch minimal compliance record fields
        return res.json({
          user_id: 'u_123',
          course_id: 'c_789',
          exam_type: 'postcourse',
          attempt_no: 1,
          passing_grade: 70,
          final_grade: 82,
          passed: true,
        });
      }
      default:
        return res.status(400).json({ error: 'unsupported_api_caller' });
    }
  } catch (err) {
    return next(err);
  }
};


