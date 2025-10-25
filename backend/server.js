const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Configuration
const PORT = process.env.PORT || 4000;
const API_BASE = '/api/v1';

// Create app
const app = express();

// Enable proxy trust for Railway/X-Forwarded-* headers
app.set('trust proxy', 1);

// Security headers per Phase 05
app.use(helmet({
	crossOriginEmbedderPolicy: false,
}));

// CORS configuration (whitelist with branch deployments)
const allowedOrigins = [
	'http://localhost:5173',
	'https://assessment-tests.vercel.app',
	'https://assessment-tests-git-main-khawlaabusaleh1-1883s-projects.vercel.app'
];

app.use(cors({
	origin: function (origin, callback) {
		if (!origin || allowedOrigins.some(o => String(origin).startsWith(o))) {
			callback(null, true);
		} else {
			console.log('🚫 Blocked CORS for origin:', origin);
			callback(new Error('Not allowed by CORS'));
		}
	},
	credentials: true,
}));

// Basic JSON body parsing
app.use(express.json({ limit: '100kb' }));

// Rate limiting per security-architecture
const limiter = rateLimit({
	windowMs: 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
});
app.use(limiter);

// (CORS preflight handled by cors middleware)

// Correlation ID for observability
app.use((req, res, next) => {
	req.correlationId = req.headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	res.setHeader('X-Correlation-Id', req.correlationId);
	next();
});

// Simple user context (x-user-id passthrough) before routes
try {
	const userContext = require('./middleware/userContext');
	app.use(userContext);
} catch (e) {
	// Optional
}

// Structured error helper
function sendError(res, http, code, message) {
	return res.status(http).json({ error: code, message });
}

// Minimal auth scope middleware (demo: mock acceptance only)
function requireScope(scope) {
	return (req, res, next) => {
		// Demo mode: accept if Authorization header present and equals "Bearer demo-token"
		const auth = req.headers.authorization || '';
		if (!auth.startsWith('Bearer ')) {
			return sendError(res, 401, 'unauthorized', 'Missing bearer token');
		}
		const token = auth.slice('Bearer '.length);
		if (token !== 'demo-token') {
			return sendError(res, 403, 'forbidden', 'Invalid or insufficient token');
		}
		// Attach mock claims
		req.user = { sub: 'demo-user', scopes: ['submit:assessments', 'manage:assessments', 'view:results'], org_id: 'demo-org' };
		if (scope && !req.user.scopes.includes(scope)) {
			return sendError(res, 403, 'forbidden', 'Insufficient scope');
		}
		next();
	};
}

// Utility to read mock JSON
function readMockJson(relativePath) {
	const filePath = path.join(__dirname, 'mock-data', relativePath);
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(content);
	} catch (e) {
		return null;
	}
}

// Demo Directory policy retrieval
async function getDirectoryPolicy() {
	const passingGrade = Number(process.env.DIRECTORY_PASSING_GRADE || 70);
	const maxAttempts = Number(process.env.DIRECTORY_MAX_ATTEMPTS || 3);
	return { passing_grade: passingGrade, max_attempts: maxAttempts };
}

// Health endpoint
app.get('/health', (req, res) => {
	res.json({ status: 'ok', time: new Date().toISOString() });
});

// One MVP endpoint: GET /api/v1/exams/baseline
app.get(`${API_BASE}/exams/baseline`, requireScope('submit:assessments'), async (req, res) => {
	const pkg = readMockJson('baseline-exam.json');
	if (!pkg) return sendError(res, 404, 'not_found', 'Baseline exam not found');
	// Baseline Exam: retrieve policy, use passing_grade only; do not enforce max_attempts here
	const policy = await getDirectoryPolicy();
	const passingGrade = policy.passing_grade;
	res.json({ exam_package: pkg, policy: { passing_grade: passingGrade } });
});

// Mount exams router
try {
	const examRoutes = require('./routes/exams');
	app.use(`${API_BASE}/exams`, examRoutes);
} catch (e) {
	// Router optional in early phases
}

// Mount exam submissions router
try {
	const submissionRoutes = require('./routes/examSubmissions');
	app.use(`${API_BASE}/exams`, submissionRoutes);
} catch (e) {
	// Optional
}

// Mount post-course exams router
try {
	const postCourseRoutes = require('./routes/postCourseExams');
	app.use(`${API_BASE}/exams`, postCourseRoutes);
} catch (e) {
	// Optional
}
// Proctoring routes
try {
    const proctorRoutes = require('./routes/proctor');
    app.use(`${API_BASE}/proctor`, proctorRoutes);
} catch (e) {
    // Optional
}

// Mount new post-course nested router with attempt enforcement
try {
	const postCourse = require('./routes/postCourse');
	app.use(`${API_BASE}/exams/post-course`, postCourse);
} catch (e) {
	// Optional
}

// Admin routes
try {
	const adminRoutes = require('./routes/admin');
	app.use(`${API_BASE}/admin`, adminRoutes);
} catch (e) {
	// Optional
}

// Fallback 404
app.use((req, res) => sendError(res, 404, 'not_found', 'Route not found'));

// Central error handler (no stack traces to client)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	console.error(JSON.stringify({ level: 'error', msg: err.message, correlation_id: req.correlationId }));
	return sendError(res, 500, 'server_error', 'Unexpected error');
});

app.listen(PORT, () => {
	console.log(`API listening on http://localhost:${PORT}`);
});


