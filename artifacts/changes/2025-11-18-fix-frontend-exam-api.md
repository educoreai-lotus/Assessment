# Frontend Exam API Alignment (2025-11-18)

Changes:

- Updated `frontend/src/services/examApi.js`:
  - Added `create(payload)` → `POST /api/exams`
  - Updated `start(examId, payload)` → `POST /api/exams/{examId}/start`
  - Updated `submit(examId, payload)` → `POST /api/exams/{examId}/submit`

- Updated UI to pass `examId` into API calls:
  - `frontend/src/pages/exam/BaselineExam.jsx` now derives `examId` from URL query `?examId=` or localStorage (`exam_baseline_id`) and calls `examApi.start(examId, ...)` and `examApi.submit(examId, ...)`.
  - `frontend/src/pages/exam/PostCourseExam.jsx` now derives `examId` from URL query `?examId=` or localStorage (`exam_postcourse_id`) and calls `examApi.start(examId, ...)` and `examApi.submit(examId, ...)`.

- Searched and removed legacy path usage `"/api/exam/"` across the frontend.

- Swagger/OpenAPI:
  - Verified backend `backend/routes/exams.js` already documents `POST /api/exams/{examId}/start` and `POST /api/exams/{examId}/submit` with path parameters. No changes required.

Build:

- Ran `npm install` and `npm run build` in `frontend/` successfully.

Notes:

- Frontend now aligns with backend exam endpoints. The UI accepts an `examId` via query string to fully connect with backend path parameters.


