CREATE TYPE exam_type AS ENUM ('baseline', 'postcourse');


CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS exams (
  exam_id SERIAL PRIMARY KEY,
  exam_type exam_type NOT NULL,
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  course_id INT,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS exam_attempts (
  attempt_id SERIAL PRIMARY KEY,
  exam_id INT REFERENCES exams(exam_id) ON DELETE CASCADE,
  attempt_no INT,
  policy_snapshot JSONB,
  started_at TIMESTAMP,
  submitted_at TIMESTAMP,
  final_grade NUMERIC(5,2),
  passed BOOLEAN,
  package_ref TEXT
);


CREATE TABLE IF NOT EXISTS attempt_skills (
  attempt_id INT REFERENCES exam_attempts(attempt_id) ON DELETE CASCADE,
  skill_id TEXT,
  skill_name TEXT,
  score NUMERIC(5,2),
  status VARCHAR(20) CHECK (status IN ('acquired','failed')),
  PRIMARY KEY (attempt_id, skill_id)
);


CREATE TABLE IF NOT EXISTS outbox_integrations (
  id SERIAL PRIMARY KEY,
  event_type TEXT,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  target_service TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);