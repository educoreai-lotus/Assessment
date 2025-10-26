const fs = require('fs');
const path = require('path');
const os = require('os');
const { evaluateSubmission } = require('./aiEvaluator');

function getPassingGrade() {
    const specific = Number(process.env.POSTCOURSE_PASSING_GRADE);
    const general = Number(process.env.PASSING_GRADE);
    if (Number.isFinite(specific) && specific > 0) return specific;
    if (Number.isFinite(general) && general > 0) return general;
    return 70;
}

function toSkillWeights(questions) {
    const counts = new Map();
    for (const q of (questions || [])) {
        const skill = q?.skill || 'General';
        counts.set(skill, (counts.get(skill) || 0) + 1);
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1;
    const weights = {};
    for (const [skill, count] of counts.entries()) {
        weights[skill] = Number((count / total).toFixed(3));
    }
    return weights;
}

function toFeedbackMap(aiFeedback, weights, passingGrade) {
    const map = {};
    for (const item of (aiFeedback || [])) {
        const skill = item?.skill || 'General';
        const score = Number(item?.score || 0);
        const weight = Number(weights?.[skill] ?? 1);
        const feedback = score >= passingGrade
            ? 'Strong performance. Keep reinforcing this skill.'
            : 'Needs improvement. Review fundamentals and practice targeted exercises.';
        map[skill] = { score, weight, feedback };
    }
    return map;
}

function writeArtifact(dirRelative, filename, data) {
    try {
        const outDir = path.join(process.cwd(), dirRelative);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const fullPath = path.join(outDir, filename);
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
        return fullPath;
    } catch (_) {
        // Fallback to temp directory if project path is read-only in env
        try {
            const tmpDir = path.join(os.tmpdir(), dirRelative);
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
            const fullPath = path.join(tmpDir, filename);
            fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
            return fullPath;
        } catch (_) {
            return null;
        }
    }
}

function evaluateCodeHeuristics(code, tests) {
    try {
        const src = String(code || '');
        if (!src.trim()) return 0;
        let score = 0;
        // Syntax/structure hints
        if (/function\s+\w+\s*\(/.test(src) || /=>/.test(src)) score += 30;
        if (/return\s+/.test(src)) score += 10;
        if (src.length > 40) score += 10;
        // Simple logic hints for common tasks (sum, map/reduce, loops)
        if (/reduce\s*\(/.test(src) || /for\s*\(/.test(src) || /forEach\s*\(/.test(src)) score += 20;
        if (/\+|\-\*\//.test(src)) score += 10;
        // Test coverage heuristic (not executing user code in prod):
        const tcount = Array.isArray(tests) ? tests.length : 0;
        if (tcount >= 2) score += 10;
        return Math.max(0, Math.min(100, score));
    } catch (_) {
        return 0;
    }
}

async function evaluatePostCourseExam({ examId, userId = 'demo-user', questions = [], answers = {}, rubric, meta } = {}) {
    const passingGrade = getPassingGrade();
    const evaluation = await evaluateSubmission({ questions, answers, passingGrade });
    const weights = toSkillWeights(questions);
    const feedback = toFeedbackMap(evaluation.ai_feedback, weights, passingGrade);
    const writtenScore = Number(evaluation.final_grade || 0);

    // Code scoring (DevLab)
    const devlabQuestion = (questions || []).find(q => String(q.type).toLowerCase() === 'devlab');
    const codeAnswer = answers?.devlab_code || (devlabQuestion ? answers?.[devlabQuestion.id] : undefined);
    const codeScore = devlabQuestion ? evaluateCodeHeuristics(codeAnswer, devlabQuestion.tests) : 0;
    if (devlabQuestion) {
        feedback.devlab_code = {
            score: codeScore,
            weight: 0.6,
            feedback: codeScore >= passingGrade ? 'Passed most heuristics and structure checks.' : 'Code needs work: add clear function, logic and return statement.',
        };
    }

    // Weighted total: 60% code, 40% written (if code question present)
    const hasCode = Boolean(devlabQuestion);
    const total = hasCode ? Math.round((0.4 * writtenScore) + (0.6 * codeScore)) : writtenScore;
    const passed = total >= passingGrade;
    const summary = evaluation.summary || (passed ? 'Passed' : 'Failed');

    const artifact = {
        exam_id: examId || null,
        user_id: userId,
        type: 'postcourse',
        inputs: { rubric: rubric || null, meta: meta || null },
        questions: (questions || []).map(q => ({ id: q.id, skill: q.skill || 'General', expected_answer: q.expected_answer || q.correct_answer || null })),
        answers: answers || {},
        ai_feedback: evaluation.ai_feedback || [],
        score_total: total,
        score_by_type: { written: writtenScore, code: codeScore },
        passed,
        summary,
        passing_grade: passingGrade,
        created_at: new Date().toISOString(),
    };

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const artifactFile = `result-${examId || 'postcourse'}-${ts}.json`;
    const artifactPath = writeArtifact('artifacts/ai-evaluation/postcourse', artifactFile, artifact);

    return {
        exam_id: examId || null,
        user_id: userId,
        type: 'postcourse',
        score_total: total,
        score_by_type: { written: writtenScore, code: codeScore },
        passed,
        feedback,
        summary,
        artifact_path: artifactPath,
    };
}

module.exports = { evaluatePostCourseExam };


