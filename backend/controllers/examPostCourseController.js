const { fetchDevLabChallenge } = require('../services/integrations/devLab');

function pickRandom(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (copy.length && out.length < n) {
        const idx = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
    }
    return out;
}

function buildWrittenBank() {
    return [
        {
            id: 'node-runtime',
            type: 'written',
            title: 'Node.js Runtime Fundamentals',
            prompt: 'Explain how the Node.js event loop and non-blocking I/O enable high throughput servers. Include an example where blocking code would degrade performance and how to mitigate it.',
            context: 'You are designing an API server expected to handle spikes of 10k RPS. Consider CPU-bound vs I/O-bound tasks.'
        },
        {
            id: 'api-design',
            type: 'written',
            title: 'API Design: REST vs gRPC',
            prompt: 'Compare REST and gRPC for internal microservice communication. Recommend one for a low-latency ML inference pipeline and justify your choice with data format, discovery, and tooling considerations.',
            context: 'Your platform operates in a zero-trust network and requires strict schema governance.'
        },
        {
            id: 'authn-authz',
            type: 'written',
            title: 'Authentication and Authorization',
            prompt: 'Describe a secure authentication and authorization flow for a multi-tenant SaaS. Include token formats, rotation strategies, and least-privilege scope modeling.',
            context: 'Tenants require isolation; auditors request traceability for admin actions.'
        },
        {
            id: 'async-programming',
            type: 'written',
            title: 'Async Programming Patterns',
            prompt: 'Discuss callbacks, promises, and async/await in Node.js. Provide code examples transforming callback code to async/await and highlight error handling best practices.',
            context: 'Legacy modules still expose callback APIs.'
        },
        {
            id: 'error-handling',
            type: 'written',
            title: 'Resilient Error Handling',
            prompt: 'Design an error handling and retry strategy for a service that calls flaky third-party APIs. Cover exponential backoff, circuit breakers, idempotency keys, and observability.',
            context: 'Latency spikes and occasional 500s are observed during traffic peaks.'
        },
    ];
}

exports.buildPostCourseExam = async (req, res) => {
    const challenge = await fetchDevLabChallenge();
    const bank = buildWrittenBank();
    const written = pickRandom(bank, 2);
    const questions = [
        ...written,
        { id: 'devlab_code', type: 'devlab', title: challenge.title, prompt: challenge.prompt, examples: challenge.examples, starter_code: challenge.starter_code, tests: challenge.tests },
    ];
    res.json({
        exam_id: 'postcourse-' + Date.now(),
        title: 'Post-Course Exam',
        duration_min: questions.length * 3,
        question_count: questions.length,
        questions,
    });
};

const { evaluatePostCourseExam } = require('../services/postCourseEvaluator');

exports.submitPostCourseExam = async (req, res) => {
    try {
        const { exam_id, user_id, answers, questions, rubric, meta } = req.body || {};
        const userId = user_id || req.user?.sub || 'demo-user';
        const result = await evaluatePostCourseExam({ examId: exam_id, userId, questions: questions || [], answers: answers || {}, rubric, meta });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'server_error', message: err.message });
    }
};


