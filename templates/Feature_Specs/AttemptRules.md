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

## Submit Endpoint (Standardized)
- Route: `POST /api/exams/{examId}/submit`
- Request body:
  - `attempt_id` (number)
  - `answers` (array of items)
    - `question_id` (string)
    - `type` ("mcq" | "open" | "code")
    - `skill_id` (string)
    - `answer` (string: raw text or code)
    - `metadata` (object, optional)
- Validation:
  - Attempt must exist and belong to path `examId`
  - Attempt must not be `canceled`
  - `now <= expires_at`
  - Proctoring camera must be `active`
- Error mapping:
  - `{ "error":"attempt_not_found" }` → 404
  - `{ "error":"exam_time_expired" }` → 403
  - `{ "error":"attempt_canceled" }` → 403

## Grading Pipeline
1. Load attempt + exam: join `exam_attempts` to `exams` to get `exam_type`, `course_id`, `user_id`.
2. Load `ExamPackage` by `attempt_id`; use its questions as the source of truth.
3. Split answers: theoretical (`type != "code"`) vs coding (`type == "code"`).
4. Theoretical grading (internal):
   - MCQ: exact string compare to `prompt.correct_answer` (or `answer_key`).
     - score = 100 if equal, else 0; status = "correct"|"incorrect"
   - Open-ended: placeholder — score = 0; status = "pending_review"
     - Note: placeholder for future AI grading; minimal `AiAuditTrail` entry recorded.
5. Coding grading (DevLab):
   - Payload: `{ exam_id, attempt_id, user_id, answers: [{ question_id, skill_id, code_answer }] }`
   - Use safe gateway with mock fallback; normalize to `{ results: [{ question_id, skill_id, score, status, feedback }] }`.
6. Merge graded items.
7. Per-skill aggregation: average numeric scores per `skill_id`; status = "acquired" if `>= passing_grade`, else "failed".
8. Final grade: average of per-skill scores; `passed = final_grade >= passing_grade`.
9. Persist:
   - PG `exam_attempts`: `submitted_at`, `final_grade`, `passed`, `status='submitted'` (preserve `canceled`)
   - PG `attempt_skills`: upsert all skills
   - Mongo `ExamPackage.grading`: `{ final_grade, passed, per_skill, engine: "internal+devlab", completed_at }`
10. Response:
```
{ user_id, exam_type, course_id, attempt_id, attempt_no, passing_grade, final_grade, passed, skills, submitted_at }
```

## Status Transitions
- `draft` → `started` (on `/start`)
- `started` → `submitted` (on `/submit`)
- Any → `canceled` (proctoring violations or admin)


