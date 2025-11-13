-- Phase 08.6 – Remote DB Bootstrap (Railway) – Verification SQL

-- 1) List public tables (expected: users, exams, exam_attempts, attempt_skills, outbox_integrations)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2) Enum values for exam_type (expected: baseline, postcourse)
SELECT unnest(enum_range(NULL::exam_type));


