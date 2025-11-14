const { createExam, markAttemptStarted, getPackageByExamId, submitAttempt } = require('../services/core/examsService');

exports.createExam = async (req, res, next) => {
  try {
    const { user_id, exam_type, course_id, course_name } = req.body || {};
    if (!user_id || !exam_type) {
      return res.status(400).json({ error: 'user_id_and_exam_type_required' });
    }
    const resp = await createExam({ user_id, exam_type, course_id, course_name });
    if (resp && resp.error) {
      return res.status(400).json(resp);
    }
    return res.status(201).json(resp);
  } catch (err) {
    return next(err);
  }
};

exports.startExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { attempt_id } = req.body || {};
    if (!attempt_id) {
      return res.status(400).json({ error: 'attempt_id_required' });
    }
    const result = await markAttemptStarted({ attempt_id });
    if (result && result.error) {
      return res.status(400).json(result);
    }
    const pkg = await getPackageByExamId(examId);
    if (!pkg) {
      return res.status(404).json({ error: 'package_not_found' });
    }
    const removeHintsDeep = (input) => {
      if (input == null) return input;
      if (Array.isArray(input)) return input.map((i) => removeHintsDeep(i));
      if (typeof input === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(input)) {
          if (k === 'hints') continue;
          out[k] = removeHintsDeep(v);
        }
        return out;
      }
      return input;
    };
    return res.json({
      exam_id: Number(pkg.exam_id),
      attempt_id: Number(pkg.attempt_id),
      exam_type: pkg?.metadata?.exam_type || null,
      user_id: pkg?.user?.user_id || null,
      course_id: pkg?.metadata?.course_id || null,
      policy: pkg?.metadata?.policy || {},
      skills: pkg?.metadata?.skills || [],
      coverage_map: pkg?.coverage_map || [],
      questions: pkg?.questions?.map((q) => removeHintsDeep(q.prompt)) || [],
    });
  } catch (err) {
    return next(err);
  }
};

exports.submitExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    void examId; // not used directly; kept for route signature clarity
    const { attempt_id, user_id, answers, per_skill } = req.body || {};
    if (!attempt_id || !user_id) {
      return res.status(400).json({ error: 'attempt_id_and_user_id_required' });
    }
    const response = await submitAttempt({ attempt_id, user_id, answers, per_skill });
    return res.json(response);
  } catch (err) {
    return next(err);
  }
};


