const { getPackageByExamId } = require('../services/core/examsService');

exports.getPackage = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const pkg = await getPackageByExamId(examId);
    if (!pkg) return res.status(404).json({ error: 'not_found' });
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
      exam_type: pkg?.metadata?.exam_type || null,
      user_id: pkg?.user?.user_id || null,
      course_id: pkg?.metadata?.course_id || null,
      policy: pkg?.metadata?.policy || {},
      skills: pkg?.metadata?.skills || [],
      coverage_map: pkg?.coverage_map || [],
      questions: (pkg?.questions || []).map((q) => removeHintsDeep(q.prompt)),
    });
  } catch (err) {
    return next(err);
  }
};


