const fs = require('fs');
const path = require('path');
const os = require('os');
const { evaluateSubmission } = require('./aiEvaluator');

function getPassingGrade() {
    const env = Number(process.env.POSTCOURSE_PASSING_GRADE);
    return Number.isFinite(env) && env > 0 ? env : 70;
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

async function evaluatePostCourseExam({ examId, userId = 'demo-user', questions = [], answers = {}, rubric, meta } = {}) {
    const passingGrade = getPassingGrade();
    const evaluation = await evaluateSubmission({ questions, answers, passingGrade });
    const weights = toSkillWeights(questions);
    const feedback = toFeedbackMap(evaluation.ai_feedback, weights, passingGrade);
    const score = Number(evaluation.final_grade || 0);
    const passed = score >= passingGrade;
    const summary = evaluation.summary || (passed ? 'Passed' : 'Failed');

    const artifact = {
        exam_id: examId || null,
        user_id: userId,
        type: 'postcourse',
        inputs: { rubric: rubric || null, meta: meta || null },
        questions: (questions || []).map(q => ({ id: q.id, skill: q.skill || 'General', expected_answer: q.expected_answer || q.correct_answer || null })),
        answers: answers || {},
        ai_feedback: evaluation.ai_feedback || [],
        score,
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
        score,
        passed,
        feedback,
        summary,
        artifact_path: artifactPath,
    };
}

module.exports = { evaluatePostCourseExam };


