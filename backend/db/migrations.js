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

module.exports = { runBootstrapMigrations, ensureExamTypeEnum };


