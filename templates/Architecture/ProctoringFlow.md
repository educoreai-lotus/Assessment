# Proctoring Flow – Camera Activation

## Components
- Backend API (`/api/proctoring`, `/api/exams/:id/start`)
- PostgreSQL (attempts)
- MongoDB (proctoring sessions, exam packages)

## Sequence
1) User initiates exam → client calls `POST /api/exams/{id}/start` with `attempt_id`.
2) Backend checks `ProctoringSession` by `attempt_id`:
   - If missing or `camera_status !== "active"` → respond `403` with `camera_required: true`.
3) Client starts camera → calls `POST /api/proctoring/:attempt_id/start_camera`.
4) Backend upserts `ProctoringSession` with `camera_status="active"`.
5) Client retries `POST /api/exams/{id}/start`:
   - Backend marks attempt started, returns package and `camera_required: true`.

## Data
- `proctoring_sessions` (Mongo):
  - `attempt_id` (string, unique), `exam_id` (string), `start_time` (Date @ insert), `camera_status` (enum), `events` ([])

## Notes
- Camera requirement is global (always `true`) in the response.
- Further proctoring event ingestion may be added via `ProctoringEvent`.


