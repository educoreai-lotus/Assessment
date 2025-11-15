# Proctoring – Camera Activation Feature

## Summary
- Enforce camera activation before exam start.
- Provide a simple proctoring session record in MongoDB.

## API
- POST `/api/proctoring/:attempt_id/start_camera`
  - Purpose: Create or upsert proctoring session and set `camera_status="active"`.
  - Response: `{ ok: true }`
- POST `/api/proctoring/:attempt_id/focus_violation`
  - Purpose: Increment focus violations; on 3rd violation cancel the attempt.
  - Responses:
    - `< 3`: `{ warning: <count> }`
    - `>= 3`: `{ cancelled: true }`
- POST `/api/exams/{examId}/start`
  - Behavior: Returns exam package only if camera is active; includes `camera_required: true` in all responses.
  - Error when inactive: `403 {"error":"camera_inactive","camera_required":true}`
  - Error when canceled: `403 {"error":"attempt_canceled"}`

## Data Model (Mongo)
- Collection: `proctoring_sessions`
- Fields:
  - `attempt_id` (string, unique)
  - `exam_id` (string)
  - `start_time` (Date, default now)
  - `camera_status` ("inactive" | "active")
  - `events` (array, default [])

- Collection: `proctoring_violations`
- Fields:
  - `attempt_id` (string, unique)
  - `count` (number, default 0)
  - `events` (array of `{ type, timestamp }`)

## Acceptance Criteria
- Starting an exam without an active camera returns 403 with `camera_required: true`.
- Calling `POST /api/proctoring/:attempt_id/start_camera` then `POST /api/exams/{id}/start` succeeds.
- ProctoringSession is created on first activation and updated on subsequent calls.


