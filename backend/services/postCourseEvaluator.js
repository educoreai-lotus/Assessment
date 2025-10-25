function evaluateAnswers(answers) {
    if (!answers || typeof answers !== 'object') return { score: 0, passed: false };
    const entries = Object.entries(answers);
    if (entries.length === 0) return { score: 0, passed: false };
    const score = Math.min(100, Math.max(0, Math.round((entries.length / 2) * 50 + 35)));
    return { score, passed: score >= 70 };
}

module.exports = { evaluateAnswers };


