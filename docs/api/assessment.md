### POST /api/exams/:examId/submit

Submits an exam attempt, performs grading, updates databases, and enqueues integration outbox events.

Request parameters:
- examId: integer (path)

Request body:
```json
{
  "attempt_id": 7,
  "answers": [
    {
      "question_id": "devlab_q42",
      "type": "code",
      "skill_id": "s_js_async",
      "answer": "async function test(){ return true; }"
    },
    {
      "question_id": "q_event_loop",
      "type": "mcq",
      "skill_id": "s_js_promises",
      "answer": "Microtasks run before rendering and before next macrotask."
    }
  ]
}
```

Response 200:
```json
{
  "user_id": "u_200",
  "exam_type": "postcourse",
  "course_id": "c_555",
  "attempt_id": 7,
  "attempt_no": 1,
  "passing_grade": 70,
  "final_grade": 85.0,
  "passed": true,
  "skills": [
    { "skill_id": "s_js_async", "skill_name": "Async JavaScript", "score": 90, "status": "acquired" }
  ],
  "submitted_at": "2025-11-16T12:59:10.000Z"
}
```

Error responses:
- 400 exam_mismatch: attempt does not belong to specified examId
- 403 exam_time_expired: submission after attempt expiration
- 403 attempt_canceled: attempt already canceled by proctoring rules
- 404 attempt_not_found: attempt_id not found
- 404 package_not_found: missing Mongo package for the attempt

Side effects:
- PostgreSQL exam_attempts: submitted_at, final_grade, passed, status ('submitted' unless 'canceled')
- PostgreSQL attempt_skills: upsert per skill (skill_id, score, status)
- Mongo exam_packages: grading block and final_status='completed'
- PostgreSQL outbox_integrations: directory_results (postcourse), skills_engine_results, course_builder_results (postcourse), protocol_camera_summary


