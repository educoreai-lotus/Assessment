const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { requireScope } = require('../utils/auth');

function ensureLogFile() {
	const dir = path.join(process.cwd(), 'artifacts/proctoring');
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	const file = path.join(dir, 'logs.json');
	if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ schema: 'v1', entries: [] }, null, 2));
	return file;
}

router.post('/log', requireScope('submit:assessments'), (req, res) => {
	try {
		const { eventType, timestamp } = req.body || {};
		const userId = req.user?.sub || 'demo-user';
		const file = ensureLogFile();
		const data = JSON.parse(fs.readFileSync(file, 'utf8'));
		data.entries = data.entries || [];
		const entry = { userId, eventType, timestamp: timestamp || Date.now(), at: new Date().toISOString() };
		data.entries.push(entry);
		// Compute incident flag per user
		const recent = data.entries.filter((e) => e.userId === userId);
		const suspicious = recent.filter((e) => ['TAB_SWITCH', 'CAMERA_DENIED'].includes(String(e.eventType)));
		const incident = suspicious.length >= 3;
		fs.writeFileSync(file, JSON.stringify({ ...data, incident: incident ? { userId, count: suspicious.length, flaggedAt: new Date().toISOString() } : data.incident || null }, null, 2));
		res.json({ ok: true, incident });
	} catch (e) {
		res.status(500).json({ error: 'server_error', message: e.message });
	}
});

module.exports = router;


