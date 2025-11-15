# Scenario – Exam Cancellation on Focus Violations

## Context
A learner repeatedly loses focus during an exam. After the third violation, the attempt is automatically canceled.

## Preconditions
- Exam attempt exists in PostgreSQL.
- Proctoring is enabled; camera activation enforced.

## Steps
1. Learner loses focus → client calls `POST /api/proctoring/:attempt_id/focus_violation`.
2. Backend increments violation count and records `{ type: "focus_lost" }` event.
3. On first and second violations: backend responds `{ warning: 1 }` then `{ warning: 2 }`.
4. On third violation:
   - Backend cancels attempt: `UPDATE exam_attempts SET status='canceled' WHERE attempt_id=$1`.
   - Backend records `{ type: "exam_canceled" }` event.
   - Responds `{ cancelled: true }`.
5. Further calls to `POST /api/exams/{id}/start` return `403 {"error":"attempt_canceled"}`.

## Expected Outcome
- Attempt is no longer startable after auto-cancel.
- Violations and cancellation are persisted in MongoDB and PostgreSQL respectively.


