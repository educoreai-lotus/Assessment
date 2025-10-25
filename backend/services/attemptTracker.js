const fs = require('fs');
const path = require('path');

const ART_PATH = path.join(process.cwd(), 'artifacts');
const LOG_PATH = path.join(ART_PATH, 'attempt-log.json');

function ensureFile() {
	if (!fs.existsSync(ART_PATH)) fs.mkdirSync(ART_PATH, { recursive: true });
	if (!fs.existsSync(LOG_PATH)) {
		fs.writeFileSync(
			LOG_PATH,
			JSON.stringify({ schema: 'v1', updatedAt: new Date().toISOString(), entries: [] }, null, 2)
		);
	}
}

function readLog() {
	ensureFile();
	return JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
}

function writeLog(data) {
	data.updatedAt = new Date().toISOString();
	fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2));
}

function key(userId, examType) {
	return (e) => e.userId === userId && e.examType === examType;
}

function getRecord(userId, examType) {
	const data = readLog();
	let rec = data.entries.find(key(userId, examType));
	return { data, rec };
}

function getAttempts(userId, examType) {
	const { rec } = getRecord(userId, examType);
	return rec?.attempts || 0;
}

function getLatestVersion(userId, examType) {
	const { rec } = getRecord(userId, examType);
	if (!rec || !rec.history?.length) return 0;
	return Math.max(...rec.history.map((h) => h.version || 0));
}

function canAttempt({ userId, examType, maxAttempts, now = new Date() }) {
	const { rec } = getRecord(userId, examType);
	if (!rec) return { ok: true, reason: null };
	if (rec.override === true) return { ok: true, reason: 'override' };
	if (rec.cooldownUntil && new Date(rec.cooldownUntil) > now) {
		return { ok: false, reason: 'cooldown', until: rec.cooldownUntil };
	}
	if ((rec.attempts || 0) >= maxAttempts) return { ok: false, reason: 'limit' };
	return { ok: true, reason: null };
}

function setCooldown({ userId, examType, until }) {
	const { data, rec } = getRecord(userId, examType);
	if (!rec) {
		data.entries.push({ userId, examType, attempts: 0, lastAttemptAt: null, cooldownUntil: until, override: false, history: [] });
	} else {
		rec.cooldownUntil = until;
	}
	writeLog(data);
}

function setOverride({ userId, examType, value }) {
	const { data, rec } = getRecord(userId, examType);
	if (!rec) {
		data.entries.push({ userId, examType, attempts: 0, lastAttemptAt: null, cooldownUntil: null, override: !!value, history: [] });
	} else {
		rec.override = !!value;
	}
	writeLog(data);
}

function recordAttempt({ userId, examType, result }) {
	const { data, rec } = getRecord(userId, examType);
	const nowIso = new Date().toISOString();
	const version = getLatestVersion(userId, examType) + 1;
	const entry = {
		n: (rec?.attempts || 0) + 1,
		at: nowIso,
		resultId: result.id || `res-${Date.now()}`,
		grade: result.final?.grade ?? (result.final_grade ?? null),
		passed: result.final?.passed ?? (result.summary ? result.summary === 'Passed' : null),
		version,
	};

	if (!rec) {
		data.entries.push({
			userId,
			examType,
			attempts: 1,
			lastAttemptAt: nowIso,
			cooldownUntil: null,
			override: false,
			history: [entry],
		});
	} else {
		rec.attempts = (rec.attempts || 0) + 1;
		rec.lastAttemptAt = nowIso;
		rec.history = rec.history || [];
		rec.history.push(entry);
		if (rec.override === true) rec.override = false;
	}
	writeLog(data);
	return { version };
}

module.exports = {
	getAttempts,
	getLatestVersion,
	canAttempt,
	recordAttempt,
	setCooldown,
	setOverride,
};


