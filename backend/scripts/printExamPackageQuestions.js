/* Prints stored question fields for a given attempt_id from Mongo ExamPackage.
 * Usage:
 *   node backend/scripts/printExamPackageQuestions.js 243
 * Requires MONGO_DB_URI or MONGO_URI to be set.
 */

const connectMongo = require('../config/mongoDB');
const { ExamPackage } = require('../models');

async function main() {
  const attemptId = process.argv[2] || '243';
  await connectMongo();

  const pkg = await ExamPackage.findOne({ attempt_id: String(attemptId) }).lean();
  if (!pkg) {
    console.log(JSON.stringify({ attempt_id: attemptId, found: false }, null, 2));
    return;
  }

  const questions = Array.isArray(pkg.questions) ? pkg.questions : [];
  const out = questions.map((q, idx) => ({
    index: idx,
    question_id: q?.question_id || null,
    prompt_correct_answer: q?.prompt?.correct_answer ?? null,
    answer_key: q?.answer_key ?? null,
    options: Array.isArray(q?.options) ? q.options : [],
  }));

  console.log(JSON.stringify({ attempt_id: attemptId, found: true, count: out.length, questions: out }, null, 2));
}

main().catch((e) => {
  console.error('[printExamPackageQuestions][ERROR]', e && e.message ? e.message : String(e));
  process.exitCode = 1;
});


