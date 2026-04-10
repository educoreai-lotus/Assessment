const { getPackageByExamId } = require('../services/core/examsService');
const { resolveExamDirectoryAccess } = require('../services/core/attemptsService');

function skipResourceOwnership(req) {
  return process.env.NODE_ENV === 'test' && !req.user;
}

exports.getPackage = async (req, res, next) => {
  try {
    const { examId } = req.params;
    if (!skipResourceOwnership(req)) {
      const dir = req.user?.directoryUserId;
      if (!dir || String(dir).trim() === '') {
        return res.status(403).json({ error: 'forbidden' });
      }
      const access = await resolveExamDirectoryAccess(examId, dir);
      if (access === 'forbidden') return res.status(403).json({ error: 'forbidden' });
      if (access === 'not_found') return res.status(404).json({ error: 'not_found' });
    }
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


