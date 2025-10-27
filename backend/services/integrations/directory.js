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

async function getLearnerProfile(userId = 'demo-user') {
    // Mocked directory profile; in production, call DIRECTORY_API_URL
    return {
        user_id: userId,
        course_id: 'demo-course',
        org_id: 'demo-org',
        level: 'intermediate',
        preferences: { language: 'en' },
    };
}

const DIRECTORY_API_URL = process.env.DIRECTORY_API_URL || '';

// Local attempt fallback uses artifacts attempt tracker
let attemptTracker;
try { attemptTracker = require('../attemptTracker'); } catch (_) { attemptTracker = null; }

async function getUserExamConfig(userId = 'demo-user', examType = 'postcourse') {
    // Simulated Directory API contract
    if (String(userId).startsWith('demo')) {
        return {
            userId: 'demo',
            examType,
            max_attempts: 5,
            attempts_used: attemptTracker ? attemptTracker.getAttempts('demo', examType) : 0,
            course_passing_grade: 75,
            skill_thresholds: {
                async_programming: 70,
                node_runtime: 70,
                error_handling: 70,
                express_routing: 70,
            },
        };
    }

    // Default fallback for non-demo users
    return {
        userId,
        examType,
        max_attempts: Number(process.env.MAX_POSTCOURSE_ATTEMPTS || 3),
        attempts_used: attemptTracker ? attemptTracker.getAttempts(userId, examType) : 0,
        course_passing_grade: 75,
        skill_thresholds: {},
    };
}

async function getAttempts({ userId = 'demo-user', examType }) {
    const fallbackMax = examType === 'baseline' ? 1 : Number(process.env.MAX_POSTCOURSE_ATTEMPTS || 3);
    if (!DIRECTORY_API_URL) {
        const attempts = attemptTracker ? (attemptTracker.getAttempts(userId, examType) || 0) : 0;
        return { attempts, maxAttempts: fallbackMax };
    }
    try {
        const url = `${DIRECTORY_API_URL.replace(/\/$/, '')}/attempts?user_id=${encodeURIComponent(userId)}&exam_type=${encodeURIComponent(examType)}`;
        const res = await fetch(url).catch(() => null);
        if (!res || !res.ok) return { attempts: 0, maxAttempts: fallbackMax };
        const data = await res.json().catch(() => ({}));
        return { attempts: Number(data.attempts || 0), maxAttempts: Number(data.maxAttempts || fallbackMax) };
    } catch (_) {
        return { attempts: 0, maxAttempts: fallbackMax };
    }
}

async function getPassingGrades({ userId = 'demo-user', examType }) {
    const defaultPassing = Number(process.env.PASSING_GRADE || 70);
    if (!DIRECTORY_API_URL) {
        const cfg = await getUserExamConfig(userId, examType);
        const skills = cfg?.skill_thresholds || {};
        return { defaultPassing, skills };
    }
    try {
        const url = `${DIRECTORY_API_URL.replace(/\/$/, '')}/passing?user_id=${encodeURIComponent(userId)}&exam_type=${encodeURIComponent(examType)}`;
        const res = await fetch(url).catch(() => null);
        if (!res || !res.ok) return { defaultPassing, skills: {} };
        const data = await res.json().catch(() => ({}));
        const skills = data.skills && typeof data.skills === 'object' ? data.skills : {};
        const def = Number(data.defaultPassing || defaultPassing);
        return { defaultPassing: def, skills };
    } catch (_) {
        return { defaultPassing, skills: {} };
    }
}

async function incrementAttempt({ userId = 'demo-user', examType, examId, score, passed }) {
    if (!DIRECTORY_API_URL) {
        try {
            // Best-effort local log
            // eslint-disable-next-line no-console
            console.log('Directory.incrementAttempt (local log)', { userId, examType, examId, score, passed });
        } catch (_) {}
        return { ok: true };
    }
    try {
        const url = `${DIRECTORY_API_URL.replace(/\/$/, '')}/attempts`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, exam_type: examType, exam_id: examId, score, passed }),
        }).catch(() => null);
        return { ok: true };
    } catch (_) {
        return { ok: false };
    }
}

module.exports = { getPolicy, getPassingPolicy, getLearnerProfile, getAttempts, getPassingGrades, incrementAttempt, getUserExamConfig };


