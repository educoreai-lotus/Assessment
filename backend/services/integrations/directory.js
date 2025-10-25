async function getPolicy() {
    return {
        passing_grade: 70,
        max_attempts: 3,
        note: 'Baseline exam ignores max_attempts',
    };
}

async function getPassingPolicy() {
    const p = await getPolicy();
    return { passing_grade: p.passing_grade, max_attempts: p.max_attempts };
}

module.exports = { getPolicy, getPassingPolicy };


