# 🧩 EduCore AI – Assessment Microservice

### 📘 Overview

The **Assessment Microservice** creates, delivers, grades, and records all EduCore AI exams.  

It manages **baseline** and **post-course** assessments, generates **AI-based questions**, evaluates answers, enforces integrity through **live proctoring**, and synchronizes structured results with all other EduCore microservices.

---

## 🔗 Integrations

| Microservice | Role |

|---------------|------|

| **Directory** | Provides `passing_grade` + `max_attempts`; receives completion metadata. |

| **Skills Engine** | Provides learner skill list for baseline; receives evaluated results **plus coverage map and final status** for post-course. |

| **Course Builder** | Provides course coverage map and learner metadata; receives final results and may grant extra attempts. |

| **DevLab** | Two-way exchange of coding and theoretical questions with difficulty control and validation. |

| **Learning Analytics** | Pulls complete result packages for performance dashboards. |

| **Reporting & HR** | Pulls summarized data for compliance and official records. |

| **RAG (Chatbot)** | Forwards incident reports; Assessment decides continue/retake. |

| **Protocol Camera** | Streams proctoring events; Assessment logs and summarizes integrity data. |

# 🧩 EduCore AI – Assessment Microservice ### 📘 Overview The **Assessment Microservice** creates, delivers, grades, and records all EduCore AI exams. It manages **baseline** and **post-course** assessments, generates **AI-based questions**, evaluates answers, enforces integrity through **live proctoring**, and synchronizes structured results with all other EduCore microservices. --- ## 🔗 Integrations | Microservice | Role | |---------------|------| | **Directory** | Provides passing_grade + max_attempts; receives completion metadata. | | **Skills Engine** | Provides learner skill list for baseline; receives evaluated results **plus coverage map and final status** for post-course. | | **Course Builder** | Provides course coverage map and learner metadata; receives final results and may grant extra attempts. | | **DevLab** | Two-way exchange of coding and theoretical questions with difficulty control and validation. | | **Learning Analytics** | Pulls complete result packages for performance dashboards. | | **Reporting & HR** | Pulls summarized data for compliance and official records. | | **RAG (Chatbot)** | Forwards incident reports; Assessment decides continue/retake. | | **Protocol Camera** | Streams proctoring events; Assessment logs and summarizes integrity data. | --- ## 🧭 User Flows ### 1️⃣ Baseline Exam
1. **Skills Engine → Assessment**: learner ID + name + skills list + passing_grade.
2. Assessment fetches passing_grade (if not included) from Directory.
3. AI generates medium-difficulty theoretical + coding questions (via DevLab).
4. AI grades answers and produces per-skill and final results.
5. Results stored in PostgreSQL and MongoDB.
6. Assessment sends results to:
   - **Skills Engine** → per-skill statuses, scores, passing_grade, final_grade, passed.
   - **Learning Analytics** → full data package (on request).

---

### 2️⃣ Post-Course Exam
1. **Course Builder → Assessment**: learner ID, course ID, coverage map.
2. Assessment fetches passing_grade + max_attempts from Directory.
3. AI generates questions based on the coverage map (skills come indirectly from Skills Engine).
4. Rules:
   - Passed → no further attempts.
   - Failed & reached max attempts → locked until extra attempt granted by Course Builder.
5. After submission AI evaluates answers and stores results.
6. Assessment sends to:
   - **Directory** → completion metadata.
   - **Course Builder** → passing_grade, final_grade, passed.
   - **Skills Engine** → per-skill results **+ coverage map + final status**.
   - **Managmenet (HR)** → fetch summarized data when requested (pull model).
   - **Learning Analytics** → fetch detailed data when requested (pull model).

---

## 🧩 DevLab Integration (Two-Way Logic)

### 📥 What Assessment Receives (from DevLab)
During exam generation when Assessment requests coding questions:
json
{
  "questions": [
    {
      "qid": "devlab_q42",
      "type": "code",
      "difficulty": "medium",
      "skill_id": "s_js_async",
      "lesson_id": "L-101",
      "course_name": "Intro to JS",
      "stem": "Write an async function that fetches data from an API and logs the result.",
      "expected_output": "{ data: ... }",
      "correct_answer": "async function fetchData(url){ const res = await fetch(url); const data = await res.json(); console.log(data); }"
    }
  ]
}
➡ Stored in exam_packages.questions[] (MongoDB). Used for coding questions (no hints shown to learners).

📤 What Assessment Sends (to DevLab)
When DevLab requests new theoretical questions for validation or training:
json
Copy code
{
  "exam_id": "ex_51a2",
  "attempt_id": "att_9m1x",
  "difficulty": "hard",
  "question": {
    "type": "mcq",
    "stem": "Which statement about event loop and microtasks in JavaScript is true?",
    "choices": [
      "Microtasks run before rendering and before next macrotask.",
      "Microtasks run after each macrotask batch completes.",
      "Microtasks run after DOM updates.",
      "Microtasks run only during async/await functions."
    ],
    "correct_answer": "Microtasks run before rendering and before next macrotask.",
    "hints": [
      "Hint 1: Think about microtasks and macrotasks scheduling order.",
      "Hint 2: Microtasks often come from Promises.",
      "Hint 3: They execute before rendering."
    ]
  }
}
➡ Stored in ai_audit_trail (MongoDB) and linked via exam_packages.lineage.generation_refs. DevLab may respond with a validation result for question quality.

🎥 Proctoring (Protocol Camera)
Continuous monitoring during exam; each event logs exam_id, user_id, event_type, timestamp, severity_score, resolution_status. Three violations → auto-termination. Events stored in proctoring_events (MongoDB); summary in exam_attempts.proctoring_summary (PostgreSQL).

💬 Incident Handling (RAG Service)
RAG forwards learner reports to Assessment. Assessment analyzes proctoring and audit logs → decides continue or retake (is_counted_as_attempt = false). Stored in incidents (MongoDB) and acknowledged back to RAG.

🧠 AI Components
Component Purpose
Question Generation Creates theoretical + coding questions and hints based on skills or coverage map.
AI Evaluation Grades answers, determines per-skill mastery, computes final grade.
AI Feedback Generates personalized feedback per skill and exam.
AI Audit Trail Logs prompts + responses for traceability in MongoDB.

⚖️ Rules & Governance
Append-only data (history preserved)
Encrypted in transit and at rest
Row-Level Security per learner (user_id)
AI lineage tracking (model version + prompt metadata)

### 📡 Data Access Model

- **Push:** Skills Engine (Baseline + Post-Course), Course Builder (Post-Course)  
- **Pull:** Learning Analytics and Reporting & HR (fetch data via GET endpoints)  
- **Endpoints:**  
  - `/api/analytics/exams` – detailed results  
  - `/api/reporting/summary` – summarized metrics  

🧱 Tech Stack
Layer Technology
Backend Node.js (Express REST API)
Frontend React 
Databases PostgreSQL + MongoDB
AI Layer OpenAI GPT-4o-mini
Deployment Railway (backend) + Vercel (frontend)
Integrations Directory, Skills Engine, Course Builder, DevLab, RAG, Learning Analytics, Reporting & HR, Protocol Camera

🚀 Quick Setup
bash
Copy code
git clone <repo_url>
cd assessment-tests
npm install

# Environment
cp secrets-template.env .env
# Add SUPABASE_DB_URL and MONGO_DB_URI

# Initialize PostgreSQL schema
psql $SUPABASE_DB_URL -f backend/db/init.sql

# Run server
npm run dev

# Health checks
curl http://localhost:3000/health/postgres
curl http://localhost:3000/health/mongo

🧾 Version
v4.3.1 – Database schema and dual-DB models finalized (Phase 07.3 Complete)

yaml
Copy code
---
✅ Now this README covers:
- Directory logic
- Skills Engine coverage map handling
- Full DevLab bidirectional flow
- All microservices and payload consistency

Save this as your **project root README.md**, then run Courser, initialize templates and documentation.

pgsql
Copy code
to link it with your SDLC tracker before proceeding to **Phase 07.4 (API & Integration Layer)**.

---

## 📦 Artifacts (Baseline – v4.3.1)

- Requirements: `artifacts/Requirements.json`
- Roadmap: `artifacts/ROADMAP.json`
- Clarifications & Refinements: `artifacts/ClarificationsAndRefinements.md`
- Feature Backlog: `artifacts/Feature_Backlog.json`
