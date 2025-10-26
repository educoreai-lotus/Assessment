const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(process.cwd(), 'artifacts', 'ai-evaluation', 'postcourse');
const LOG_FILE = path.join(OUT_DIR, 'results-log.json');

function ensure() {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, JSON.stringify({ schema: 'v1', entries: [] }, null, 2));
}

function readAll() {
    ensure();
    try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')); } catch (_) { return { schema: 'v1', entries: [] }; }
}

function writeAll(data) {
    ensure();
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
}

function saveResult({ userId, attempt, max_attempts, requires_retake, unmet_skills, passed_skills, final_grade, course_passing_grade, version }) {
    const data = readAll();
    const now = new Date().toISOString();
    data.entries.push({
        user_id: userId,
        exam_type: 'postcourse',
        attempt,
        max_attempts,
        final_grade,
        requires_retake: !!requires_retake,
        unmet_skills: Array.isArray(unmet_skills) ? unmet_skills : [],
        passed_skills: Array.isArray(passed_skills) ? passed_skills : [],
        course_passing_grade,
        version: Number(version || attempt || 1),
        created_at: now,
    });
    writeAll(data);
}

function getLastAttempt(userId) {
    const data = readAll();
    const list = data.entries.filter(e => e.user_id === userId && e.exam_type === 'postcourse');
    if (!list.length) return null;
    // latest by created_at
    list.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return list[list.length - 1];
}

module.exports = { saveResult, getLastAttempt };


