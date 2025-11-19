// Simple theoretical questions mock builder
// Returns questions in the required structure:
// {
//   qid: "mock_q_<n>",
//   type: "mcq",
//   skill_id,
//   difficulty: "medium",
//   prompt: {
//     question: "...",
//     options: ["<div>", "<span>", "<p>", "<a>"],
//     correct_answer: "<div>"
//   }
// }

function buildMockQuestions({ skills = [], amount = 4 }) {
  const baseOptions = ["<div>", "<span>", "<p>", "<a>"];
  const results = [];
  const pool = skills.length > 0 ? skills : ["general"];
  const total = Math.max(1, amount);
  for (let i = 0; i < total; i += 1) {
    const skill_id = String(pool[i % pool.length] || "general");
    results.push({
      qid: `mock_q_${i + 1}`,
      type: "mcq",
      skill_id,
      difficulty: "medium",
      prompt: {
        question: "Which HTML tag represents a generic container?",
        options: baseOptions.slice(),
        correct_answer: "<div>",
      },
    });
  }
  return results;
}

module.exports = { buildMockQuestions };


