const DEVLAB_API_URL = process.env.DEVLAB_API_URL || '';

async function fetchDevLabChallenge() {
    const fallback = {
        id: 'devlab-fallback-fizzbuzz',
        title: 'FizzBuzz Function',
        prompt: 'Write a JS function that prints numbers 1–100 with FizzBuzz rules.',
        starter_code: 'function fizzBuzz() {\n  // your code\n}\n',
        tests: [{ input: null, expected: '1, 2, Fizz, 4, Buzz, ...' }],
    };
    if (!DEVLAB_API_URL) return fallback;
    try {
        const url = `${DEVLAB_API_URL.replace(/\/$/, '')}/api/v1/devlab/challenges/sample`;
        const res = await fetch(url).catch(() => null);
        if (!res || !res.ok) return fallback;
        const data = await res.json().catch(() => ({}));
        return {
            id: data.id || fallback.id,
            title: data.title || fallback.title,
            prompt: data.prompt || fallback.prompt,
            starter_code: data.starter_code || data.starter || fallback.starter_code,
            tests: Array.isArray(data.tests) ? data.tests : fallback.tests,
        };
    } catch (_) {
        return fallback;
    }
}

async function getDevLabQuestions(skill) {
    const challenge = await fetchDevLabChallenge();
    return [
        {
            id: `dev-${skill.id || String(skill).toLowerCase()}`,
            type: 'devlab',
            source: 'DevLab',
            skill: skill.name || String(skill),
            question: challenge.prompt,
            title: challenge.title,
            starter_code: challenge.starter_code,
            tests: challenge.tests,
            expected_answer: 'code',
        },
    ];
}

module.exports = { getDevLabQuestions, fetchDevLabChallenge };


