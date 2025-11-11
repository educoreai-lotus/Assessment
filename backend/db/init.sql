BEGIN;

-- Phase 07.3 – Database Schema Construction
-- PostgreSQL initialization script generated from templates/Database_Schema_Spec.md

DO $enum$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'exam_type'
  ) THEN
    CREATE TYPE exam_type AS ENUM ('baseline', 'postcourse');
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumtypid = 'exam_type'::regtype
        AND enumlabel = 'baseline'
    ) THEN
      ALTER TYPE exam_type ADD VALUE IF NOT EXISTS 'baseline';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumtypid = 'exam_type'::regtype
        AND enumlabel = 'postcourse'
    ) THEN
      ALTER TYPE exam_type ADD VALUE IF NOT EXISTS 'postcourse';
    END IF;
  END IF;
END;
$enum$;

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  exam_id TEXT PRIMARY KEY,
  exam_type exam_type NOT NULL,
  user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
  course_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  attempt_id TEXT PRIMARY KEY,
  exam_id TEXT REFERENCES exams(exam_id) ON DELETE CASCADE,
  attempt_no INT NOT NULL CHECK (attempt_no > 0),
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

CREATE TABLE IF NOT EXISTS attempt_skills (
  attempt_id TEXT REFERENCES exam_attempts(attempt_id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  skill_name TEXT,
  score NUMERIC,
  status TEXT CHECK (status IN ('acquired','failed')),
  PRIMARY KEY (attempt_id, skill_id)
);

CREATE TABLE IF NOT EXISTS outbox_integrations (
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

CREATE INDEX IF NOT EXISTS idx_exam_attempts_submitted_at ON exam_attempts (exam_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_attempt_skills_status ON attempt_skills (status);
CREATE INDEX IF NOT EXISTS idx_outbox_target_status ON outbox_integrations (target_service, status);

COMMIT;

