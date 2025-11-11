# Assessment Prompt Templates (Phase 07.4)

version: v1.0.0  
traceability_id: phase074-ai-prompt-engine  
source_templates: templates/06-AI_Design_Prompt.md

---

## 1) Question Generation Templates

### A. Baseline Exam Question Generation

```json
{
  "role": "question_generator",
  "phase": "baseline",
  "objectives": [
    "Generate theoretical and coding questions for baseline assessment",
    "Match requested skills and target difficulty"
  ],
  "constraints": [
    "No leakage of answers in learner-facing content",
    "Provide hints only in DevLab validation context"
  ],
  "inputs": {
    "skills": ["s_html", "s_js_async"],
    "difficulty": "medium",
    "num_questions": 10
  },
  "outputs": {
    "questions": [
      {
        "qid": "auto",
        "type": "theoretical|code",
        "skill_id": "s_js_async",
        "lesson_id": "L101",
        "stem": "Explain how promises chain with then/catch.",
        "choices": ["..."],
        "correct_answer": "Reference answer text or code",
        "hints": ["..."]
      }
    ]
  }
}
```

### B. Post-Course Exam Question Generation

```json
{
  "role": "question_generator",
  "phase": "postcourse",
  "objectives": [
    "Generate questions aligned to coverage_map",
    "Ensure difficulty ramp matches course outcomes"
  ],
  "constraints": [
    "Respect Directory policy for passing_grade and max_attempts"
  ],
  "inputs": {
    "coverage_map": [{"lesson_id": "L101", "skills": ["s_js_async", "s_js_promises"]}],
    "difficulty": "hard",
    "num_questions": 12
  },
  "outputs": {
    "questions": [
      {
        "qid": "auto",
        "type": "theoretical|code",
        "skill_id": "s_js_promises",
        "lesson_id": "L101",
        "stem": "Refactor the function to use async/await.",
        "choices": [],
        "correct_answer": "async function ...",
        "hints": ["Consider try/catch for error handling"]
      }
    ]
  }
}
```

---

## 2) Grading Prompt Schema

```json
{
  "role": "grader",
  "phase": "grading",
  "objectives": [
    "Evaluate correctness, completeness, and clarity",
    "Compute per-skill scores and aggregate final_grade"
  ],
  "constraints": [
    "No hallucinated facts in theoretical answers",
    "For code, execute mental model only; avoid network/file access"
  ],
  "inputs": {
    "attempt_id": "att_9m1x",
    "questions": [
      {"qid": "q1", "type": "theoretical", "skill_id": "s_html", "stem": "...", "expected_answer": "..."},
      {"qid": "q2", "type": "code", "skill_id": "s_js_async", "stem": "...", "expected_output": "..."}
    ],
    "responses": [
      {"qid": "q1", "answer": "..."},
      {"qid": "q2", "code": "function x(){...}", "output": "..."}
    ],
    "policy": {"passing_grade": 70}
  },
  "outputs": {
    "results": [
      {"qid": "q1", "score": 85, "status": "correct"},
      {"qid": "q2", "score": 72, "status": "partially_correct"}
    ],
    "final_grade": 79,
    "passed": false,
    "per_skill": [
      {"skill_id": "s_html", "skill_name": "HTML Structure", "score": 85, "status": "acquired"},
      {"skill_id": "s_js_async", "skill_name": "Asynchronous Programming", "score": 72, "status": "acquired"}
    ]
  }
}
```

---

## 3) Feedback Prompt Schema

```json
{
  "role": "feedback_generator",
  "phase": "post-grading",
  "objectives": [
    "Produce constructive, actionable learner feedback",
    "Reference lesson anchors and next steps"
  ],
  "constraints": [
    "No revealing exact correct answers verbatim",
    "Limit per question feedback to ≤ 80 words"
  ],
  "inputs": {
    "attempt_id": "att_9m1x",
    "per_skill": [
      {"skill_id": "s_html", "score": 85, "status": "acquired"},
      {"skill_id": "s_js_async", "score": 62, "status": "failed"}
    ],
    "coverage_map": [{"lesson_id": "L101", "skills": ["s_js_async"]}]
  },
  "outputs": {
    "feedback_summary": "Focus on async/await patterns; practice error handling.",
    "recommendations": [
      {"lesson_id": "L101", "action": "Review async error handling patterns"},
      {"lesson_id": "L101", "action": "Re-attempt coding exercise on promises"}
    ]
  }
}
```


