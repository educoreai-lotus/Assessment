async function ensureExamTypeEnum(pool) {
  // Create exam_type enum if missing and ensure required values exist
  const createEnumSql = `
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_type') THEN
      CREATE TYPE exam_type AS ENUM ('baseline', 'postcourse');
    END IF;
    -- Ensure baseline exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'baseline'
        AND enumtypid = 'exam_type'::regtype
    ) THEN
      ALTER TYPE exam_type ADD VALUE 'baseline';
    END IF;
    -- Ensure postcourse exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'postcourse'
        AND enumtypid = 'exam_type'::regtype
    ) THEN
      ALTER TYPE exam_type ADD VALUE 'postcourse';
    END IF;
  END
  $$;
  `;
  try {
    await pool.query(createEnumSql);
    const { rows } = await pool.query(
      "SELECT unnest(enum_range(NULL::exam_type)) AS value"
    );
    const values = rows.map((r) => r.value);
    // eslint-disable-next-line no-console
    console.log('✅ exam_type enum verified:', values);
    return values;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to ensure exam_type enum:', err?.message || err);
    return [];
  }
}

async function runBootstrapMigrations(pool) {
  await ensureExamTypeEnum(pool);
}

async function ensureExamStatusColumns(pool) {
  const sql = `
  DO $$
  BEGIN
    -- status column
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'exams' AND column_name = 'status'
    ) THEN
      ALTER TABLE exams ADD COLUMN status VARCHAR(20);
    END IF;

    -- progress column
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'exams' AND column_name = 'progress'
    ) THEN
      ALTER TABLE exams ADD COLUMN progress INT;
    END IF;

    -- error_message column
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'exams' AND column_name = 'error_message'
    ) THEN
      ALTER TABLE exams ADD COLUMN error_message TEXT;
    END IF;

    -- failed_step column
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'exams' AND column_name = 'failed_step'
    ) THEN
      ALTER TABLE exams ADD COLUMN failed_step TEXT;
    END IF;

    -- updated_at column
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'exams' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE exams ADD COLUMN updated_at TIMESTAMP;
    END IF;

    -- exam_attempts.coverage_snapshot for post-course coverage persistence
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'exam_attempts' AND column_name = 'coverage_snapshot'
    ) THEN
      ALTER TABLE exam_attempts ADD COLUMN coverage_snapshot JSONB;
    END IF;
  END
  $$;`;
  try {
    await pool.query(sql);
    // eslint-disable-next-line no-console
    console.log('✅ exams status columns verified (status/progress/error_message/failed_step/updated_at)');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to ensure exams status columns:', err?.message || err);
  }
}

module.exports = { runBootstrapMigrations, ensureExamTypeEnum, ensureExamStatusColumns };


