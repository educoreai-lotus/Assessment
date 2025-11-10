# Changelog

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