const DEVLAB_API_URL = process.env.DEVLAB_API_URL || '';

async function fetchDevLabChallenge() {
    const fallback = {
        id: 'devlab-fallback-fizzbuzz',
        title: 'FizzBuzz Function with Input Validation',
        prompt: 'Write a JavaScript function `fizzBuzz(n)` that prints numbers 1–n. For multiples of 3, print "Fizz"; for 5, "Buzz"; for both, "FizzBuzz". Validate that n is a positive integer. Return the result as an array of strings.',
        examples: [
            { input: 5, output: ["1", "2", "Fizz", "4", "Buzz"] }
        ],
        starter_code: 'function fizzBuzz(n) {\n  // TODO: implement validation and logic\n}\n',
        tests: [{ input: 5, expected: ["1", "2", "Fizz", "4", "Buzz"] }],
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
            examples: Array.isArray(data.examples) ? data.examples : fallback.examples,
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
            examples: challenge.examples,
            starter_code: challenge.starter_code,
            tests: challenge.tests,
            expected_answer: 'code',
        },
    ];
}

module.exports = { getDevLabQuestions, fetchDevLabChallenge };


