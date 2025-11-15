# Exam Flow – Start, Proctoring, and Cancellation

## Overview
This document describes how exam start interacts with proctoring camera activation and focus violation auto-cancel behavior.

## Actors
- Learner (client)
- Backend (`/api/exams`, `/api/proctoring`)
- PostgreSQL (`exam_attempts`)
- MongoDB (`proctoring_sessions`, `proctoring_violations`)

## Sequence
1) Learner tries to start exam:
   - Client calls `POST /api/exams/{examId}/start` with `{ attempt_id }`.
   - Backend checks `exam_attempts.status`. If `canceled` → `403 {"error":"attempt_canceled"}`.
   - Backend checks `ProctoringSession`. If camera not active → `403 {"error":"camera_inactive","camera_required":true}`.
   - If allowed, marks attempt started and returns exam package; payload includes `camera_required: true`.

2) Focus violation:
   - Client calls `POST /api/proctoring/:attempt_id/focus_violation` on focus loss.
   - Backend upserts `ProctoringViolation`, increments `count`, appends `{ type:"focus_lost", timestamp }`.
   - If `count < 3` → `{ warning: count }`.
   - If `count >= 3` →
     - `ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS status VARCHAR(20)` (best-effort safeguard).
     - `UPDATE exam_attempts SET status='canceled' WHERE attempt_id=$1`.
     - Append `{ type:"exam_canceled" }` to violation events and return `{ cancelled: true }`.

3) Subsequent start attempts after cancellation:
   - `POST /api/exams/{examId}/start` checks PG and returns `403 {"error":"attempt_canceled"}`.

## Notes
- Cancellation is authoritative in PostgreSQL (`exam_attempts.status`).
- Proctoring sessions and violations live in MongoDB for fast append and analysis.


