# <Project_Name> – <Feature_Name>
## 🐘 PostgreSQL Schema (Relational Truth Layer)

```sql
CREATE TYPE exam_type AS ENUM ('baseline', 'postcourse');

CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exams (
  exam_id TEXT PRIMARY KEY,
  exam_type exam_type NOT NULL,
  user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
  course_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exam_attempts (
  attempt_id TEXT PRIMARY KEY,
  exam_id TEXT REFERENCES exams(exam_id) ON DELETE CASCADE,
  attempt_no INT NOT NULL,
  policy_snapshot JSONB NOT NULL,
  coverage_map JSONB,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  final_grade NUMERIC,
  passed BOOLEAN,
  package_ref TEXT,
  proctoring_summary JSONB,
  UNIQUE (exam_id, attempt_no)
);

CREATE TABLE attempt_skills (
  attempt_id TEXT REFERENCES exam_attempts(attempt_id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  skill_name TEXT,
  score NUMERIC,
  status TEXT CHECK (status IN ('acquired','failed')),
  PRIMARY KEY (attempt_id, skill_id)
);

CREATE TABLE outbox_integrations (
  event_id TEXT PRIMARY KEY,
  attempt_id TEXT REFERENCES exam_attempts(attempt_id) ON DELETE CASCADE,
  target_service TEXT NOT NULL,
  integration_type TEXT CHECK (integration_type IN ('push','pull')),
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending','sent','failed','served')) DEFAULT 'pending',
  request_source TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  response_time_ms INT
);

CREATE INDEX idx_exam_attempts_submitted_at ON exam_attempts (exam_id, submitted_at);
CREATE INDEX idx_attempt_skills_status ON attempt_skills (status);
CREATE INDEX idx_outbox_target_status ON outbox_integrations (target_service, status);
🍃 MongoDB Schema (Dynamic Layer)
exam_packages

ai_audit_trail

proctoring_events

incidents

Each document mirrors the examples below:

json
Copy code
{
  "_id": "att_9m1x",
  "exam_id": "ex_51a2",
  "user": { "user_id": "u_123", "name": "Jane Doe" },
  "questions": [],
  "grading": { "final_grade": 82, "passed": true },
  "coverage_map": [],
  "final_status": "completed",
  "proctoring": {},
  "lineage": {}
}
