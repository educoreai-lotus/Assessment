const {
  buildTheoreticalQuestion,
} = require("../../services/builders/TheoreticalQuestionBuilder");

describe("TheoreticalQuestionBuilder", () => {
  test("forces medium difficulty by default", () => {
    const input = {
      type: "theoretical",
      stem: "What is closure in JavaScript?",
      choices: ["A", "B", "C", "D"],
      correct_answer: "A",
      difficulty: "hard",
    };
    const q = buildTheoreticalQuestion(input);
    expect(q.difficulty).toBe("medium");
    expect(q.type).toBe("mcq");
  });

  test("preserves external difficulty when allowed", () => {
    const input = {
      type: "mcq",
      stem: "What is hoisting?",
      choices: ["A", "B", "C", "D"],
      correct_answer: "B",
      difficulty: "hard",
    };
    const q = buildTheoreticalQuestion(input, true);
    expect(q.difficulty).toBe("hard");
    expect(q.type).toBe("mcq");
  });

  test("defaults difficulty to medium when not provided even if allowed", () => {
    const input = {
      type: "theoretical",
      stem: "Explain event loop.",
      choices: ["x", "y"],
      correct_answer: "x",
    };
    const q = buildTheoreticalQuestion(input, true);
    expect(q.difficulty).toBe("medium");
  });
});
