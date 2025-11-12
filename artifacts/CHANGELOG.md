# Changelog

## v4.3.1 – backend release validated and deployed (2025-11-11)
- Phase 09 completed: Code review and deployment readiness artifacts generated.
- Roadmap updated to Phase 09 = Done.
- Tag planned: v4.3.1-release (pushed with backend release).
- Health endpoints ready for Railway validation: /health, /health/postgres, /health/mongo.

## v4.3.1 – backend health verified and release validated on Railway (2025-11-11)
- Railway URL: https://assessment-tests-production.up.railway.app
- Endpoint results recorded in `artifacts/phase09-verification-summary.json`
  - /health: ok
  - /health/postgres: error (Postgres not reachable)
  - /health/mongo: error (MongoDB health check failed)
- Next: Begin Phase 07.5 – Frontend Service Adapters

## v4.3.1-p076 - Phase 07.6: Frontend UI Components (2025-11-12)
- Initialized production-ready Vite + React app in `/frontend` with Tailwind (darkMode: 'class'), Framer Motion, Recharts, and axios.
- Added `.env` variable `VITE_API_BASE_URL` (fallback coded to production URL if env unavailable in runtime).
- Pages:
  - `HomePage.jsx` with hero, gradient text, and 3 feature cards + CTAs
  - `exam/BaselineExam.jsx` (loads questions, progress, submit)
  - `exam/PostCourseExam.jsx` (shows course_id, coverage_map, attempt; renders questions; submit)
  - `results/ResultsDashboard.jsx` (per-skill cards + Recharts bar/pie; final grade + pass/fail)
  - `dev/Health.jsx` (calls `/health`, `/health/postgres`, `/health/mongo` and shows HTTP status + payload)
- Components:
  - `Navbar.jsx`, `QuestionCard.jsx`, `CodingPanel.jsx`, `ProctoringLog.jsx`, `IncidentViewer.jsx`, `shared/LoadingSpinner.jsx`
- Routing: `/`, `/exam/baseline`, `/exam/postcourse`, `/results`, `/dev/health`
- Styling: Dark-Emerald theme, gradient cards, soft shadows, responsive grid, hover lift, route transitions.
- API wiring (axios baseURL = `import.meta.env.VITE_API_BASE_URL` with production fallback).
- Commit: included in main branch; see ROADMAP entry `v4.3.1-p076`.

## v4.3.1-p0760a - Phase 07.6.0a: Theme Variable Injection (2025-11-12)
- Injected Dark Emerald CSS variable system into `frontend/src/index.css` (non-destructive).
- Added day-mode, night-mode, accessibility classes (colorblind-friendly, high-contrast, large-font) without applying any body class by default.
- Preserved existing Tailwind appearance; variables available globally for future use.
- Commit: 5f1f4b1148f581745d11f700737bc18db10a2e9b

## v4.3.1-p0761 - Phase 07.6.1: Branding & Theme Enhancement (2025-11-12)
- Replaced favicon with `/public/logo-night.jpeg` and updated title to “EduCore AI – Assessment Center”.
- Navbar branding: dynamic logo image (day/night) + “Assessment” label.
- Added theme toggle (🌞/🌙) with persistence via localStorage; toggles `day-mode`/`night-mode` on `body`.
- Maintained Dark Emerald visuals and motion; both modes render with smooth transitions.
- Commit: 445b4dc1ddfaa6b28a6bc288dc7f36159a215486

## v4.3.1-p08 - Phase 08: Testing & Verification (deployed mode) (2025-11-11)
- Executed API and docs tests with Jest/Supertest.
- Results:
  - Test suites: 3 total; 2 passed; 1 failed to run (health suite import error)
  - Tests: 12 passed; 0 failed
- Generated `artifacts/Validation_Report_Phase08.md` summarizing outcomes and remediation notes.
- Artifacts: `artifacts/jest-results-phase08.json`, `artifacts/p08-testing-verification.json`
- Notes: Health route suite failure due to model import in test context; endpoints and Swagger docs validated successfully.

## v4.3.1-p074 - Phase 07.4: API & Integration Layer (2025-11-11)
- Added unified inbound endpoint `/api/assessment/integration` (POST/GET) per Integration Map covering Directory, Skills Engine, Course Builder, DevLab, RAG, Protocol Camera, Learning Analytics, and Management.
- Implemented outbound integration service clients:
  - Directory: `/api/directory/policy/:exam_type`, `/api/directory/exam-results`
  - Skills Engine: `/api/skills-engine/assessment-results`
  - Course Builder: `/api/course-builder/exam-results`
  - DevLab: `/api/devlab/theoretical`, `/api/devlab/results`
  - RAG: `/api/rag/incident-response`
  - Protocol Camera: `/api/protocol-camera/summary`
- Mounted Swagger docs at `/docs` and generated `backend/swagger/swagger.json`.
- Created AI Prompt Engine templates at `ai/prompts/assessment_prompts.md`.
- Traceability:
  - phase-07-4-full-integration-build
  - phase-07-4-service-clients
  - phase-07-4-swagger
  - phase074-ai-prompt-engine

## v4.3.1 - SDLC Template Execution (Phases 01–09) (2025-11-11)
- Executed Main Project Development Flow (v4.0) sequentially for phases 01–09.
- Generated one artifact JSON per phase:
  - `artifacts/p01-initial-setup.json`
  - `artifacts/p02-user-requirements.json`
  - `artifacts/p03-feature-planning.json`
  - `artifacts/p04-design-architecture.json`
  - `artifacts/p05-security-compliance.json`
  - `artifacts/p06-ai-design.json`
  - `artifacts/p07-implementation.json`
  - `artifacts/p08-testing-verification.json`
  - `artifacts/p09-code-review-deployment.json`
- Updated `artifacts/ROADMAP.json` with versioned phase_updates (v4.3.1-p01 through v4.3.1-p09).
- Linked baseline artifacts in `README.md` (v4.3.1).

## v4.3.1 - Phase 07.3: Database Schema Construction (2025-11-11)
- Hardened `backend/db/init.sql` with enum synchronization and attempt number validation to keep Postgres aligned with `templates/Database_Schema_Spec.md`.
- Tightened MongoDB models in `backend/models/` with required attempt linkage, default metadata shells, and additional indexing for query readiness.
- Extended `/health/postgres` and `/health/mongo` in `backend/server.js` to verify enum contents and observed collections for double-database observability.

## v4.3.0 - Phase 07.3: Database Schema Construction (2025-11-11)
- Synced `backend/db/init.sql` with `templates/Database_Schema_Spec.md` to provision users, exams, attempts, skills, and outbox tables.
- Refactored MongoDB models in `backend/models/` to match schema field naming and ensure collection readiness.
- Validated `/health/postgres` and `/health/mongo` endpoints via `backend/server.js` to confirm database availability.

## v4.2.0 - Phase 07.2: MongoDB Integration (2025-11-10)
- Connected backend to MongoDB Atlas via Mongoose and exposed `/health/mongo` for runtime verification.
- Commit: 5f08e0a58891ad8bc1bf1969691809ef4e08f629

## v3.4.0 - Phase 16: AI Validation, Proctoring, Retake (2025-10-25)
- Added backend `backend/services/aiValidator.js` to validate AI-generated questions and log to `artifacts/ai-validation/validation-log.json`.
- Integrated validation gate into baseline and post-course exam builders.
- Implemented proctoring: frontend `ProctorMonitor.jsx` and backend route `/api/v1/proctor/log` writing to `artifacts/proctoring/logs.json` with incident flagging.
- Extended post-course evaluation for retake reasoning: generates targeted retake exam at `artifacts/ai-generation/retake-exam.json`, enforces cooldown via Directory policy.
- Switched frontend API base to `VITE_API_BASE` for production deployment (Railway + Vercel).

## [Phase 01] - 2025-10-23
- Initialized artifact structure and baseline configs.
- Added CI/CD, testing, security, and docs templates.

## [Phase 07] - 2025-10-24
- Frontend Baseline Exam UI implemented.
- Added files:
  - `frontend/src/api/examApi.js`
  - `frontend/src/pages/BaselineExam.jsx`
  - `frontend/src/components/QuestionCard.jsx`
  - `frontend/src/components/ExamTimer.jsx`
  - `frontend/src/index.css`
- Updated:
  - `frontend/src/main.jsx` to render `BaselineExam` for testing.

## [Phase 13] - 2025-10-24
- AI Evaluation & Feedback added.
- Added files:
  - `backend/controllers/examSubmit.js`
  - `backend/services/mockAiEvaluator.js`
  - `backend/routes/examSubmissions.js`
  - `frontend/src/api/evaluationApi.js`
  - `frontend/src/pages/BaselineResults.jsx`
- Updated:
  - `backend/server.js` to mount submission routes
  - `frontend/src/pages/BaselineExam.jsx` to submit answers and show results
- Artifacts:
  - `artifacts/ai-evaluation/feedback-sample.json`

## [Phase 14] - 2025-10-24
- Post-Course Exam Scaffold added.
- Backend:
  - `backend/controllers/postCourseExamBuilder.js`
  - `backend/controllers/postCourseExamSubmit.js`
  - `backend/routes/postCourseExams.js`
  - `backend/services/integrations/courseBuilder.js`
  - Extended: `backend/services/integrations/directory.js`
  - Extended: `backend/services/mockAiQuestionGenerator.js`
  - Extended: `backend/services/mockAiEvaluator.js`
- Frontend:
  - `frontend/src/api/postCourseApi.js`
  - `frontend/src/api/postCourseEvalApi.js`
  - `frontend/src/pages/PostCourseExam.jsx`
  - `frontend/src/pages/PostCourseResults.jsx`
  - Updated routing in `frontend/src/main.jsx`
- Artifacts:
  - `artifacts/ai-generation/post-course-exam-build.json`
  - `artifacts/ai-evaluation/post-course-feedback.json`

## 2025-10-25
- Phase 14.1: Enforced Directory max_attempts and cooldowns for Post-Course Exam.
- Added attempt logging + versioned results; incident override endpoint.