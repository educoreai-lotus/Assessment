# Feature Spec: Attempt Rules – Cancellation & Restrictions

## Scope
- Define attempt cancellation triggers and start restrictions.

## Cancellation Triggers
- Focus violations: On 3rd `focus_lost` event → cancel attempt.
- Manual: Future admin or proctor action may set status to canceled (out of scope here).

## Persistence
- PostgreSQL: `exam_attempts.status = 'canceled'`.
- MongoDB:
  - `proctoring_violations` records `{ type: 'focus_lost' }` events and final `{ type: 'exam_canceled' }` event.

## Start Restrictions
- `POST /api/exams/{examId}/start` must:
  - Return `403 {"error":"attempt_canceled"}` if `exam_attempts.status = 'canceled'`.
  - Enforce `camera_required` (active) prior to start; otherwise `403 {"error":"camera_inactive","camera_required":true}`.
  - Block expired attempts: `403 {"error":"exam_time_expired"}` when `now > expires_at`.

## Acceptance Criteria
- Third violation cancels attempt and blocks subsequent starts.
- Cancellation state is authoritative in Postgres; violations trail is stored in MongoDB.

## Timing & Expiration
- Duration:
  - Baseline: `skills.length * 4` minutes
  - Postcourse: `sum(coverage_map[*].skills.length) * 4` minutes
- Persistence:
  - PG: `exam_attempts.duration_minutes`, `exam_attempts.expires_at`
  - Mongo: `ExamPackage.metadata.time_allocated_minutes`, `ExamPackage.metadata.expires_at`, `ExamPackage.metadata.start_time` (on start)
- Blocking:
  - Start: `now > expires_at` → `403 {"error":"exam_time_expired"}`
  - Submit: `now > expires_at` → `{ "error":"exam_time_expired" }`
  - Remaining time endpoint: `/api/attempts/{attempt_id}/remaining_time`


