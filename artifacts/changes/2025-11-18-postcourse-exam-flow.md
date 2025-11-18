# Change Log – 2025-11-18

## Title
Implement full PostCourse exam flow: camera, proctoring, navigation, and results

## Frontend
- Added stable post-course exam flow mirroring Baseline:
  - `frontend/src/pages/exam/PostCourseExam.jsx`: 
    - Resolves `demo_user_id` and `course_id` (from query or localStorage).
    - Creates/fetches post-course exam (`exam_type: 'postcourse'`, includes `course_id`).
    - Activates camera via `CameraPreview`; starts backend proctoring on ready.
    - Starts exam only after `cameraOk === true` with `{ attempt_id }`.
    - One-question-per-page UI with progress and guarded navigation.
    - Auto-save in local component state (same as Baseline).
    - Submit navigates to PostCourseResults with `{ attemptId, state: { result } }`.
    - Implements 3-strike proctoring (blur/tab-switch/minimize) with incident logging and auto-cancel redirect.
  - `frontend/src/pages/PostCourseResults.jsx`:
    - Results view including `course_id`, `course_name`, `attempt_no`, `max_attempts`, final grade, pass/fail, passing grade, skills, and coding summary when present.
  - `frontend/src/main.jsx`
    - Added routes: `/results/postcourse` and `/results/postcourse/:attemptId`.

## Backend (no changes required)
- Existing endpoints already support `postcourse`:
  - `POST /api/exams` (with `course_id`), `POST /api/exams/:id/start`, `POST /api/exams/:id/submit`
  - `GET /api/attempts/:attemptId` returns postcourse fields
  - Proctoring incident logging via `POST /api/proctoring/:attemptId/incident`

## Notes
- On `max_attempts_reached` start error: redirects to the latest available post-course attempt results when possible; otherwise shows an error.
- `CameraPreview` is mounted once per exam and not placed inside keyed motion blocks.

## Files Changed
- frontend/src/pages/exam/PostCourseExam.jsx
- frontend/src/pages/PostCourseResults.jsx (added)
- frontend/src/main.jsx

## Tracking
- ROADMAP updated with feature `FEAT-POSTCOURSE-EXAM-FLOW` (Done).


