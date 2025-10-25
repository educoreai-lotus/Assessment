# Assessment Tests – AI-Assisted Exam Microservice

## 🎯 Project Overview

This project implements an **AI-driven Assessment Microservice** that builds and manages baseline and post-course exams for learners.  
It automatically assembles question packages, evaluates results, and delivers AI-generated feedback — all with full auditability, security, and localization.

### 🧠 System Purpose
The system provides two types of evaluations:
1. **Baseline Exam** — Conducted at the start of a course to measure initial skill level.  
   - Combines theoretical and coding questions (from **DevLab**).  
   - Establishes the learner’s baseline proficiency.
2. **Post-Course Exam** — Conducted after completing a course.  
   - Attempts and policies defined by **Directory** (max attempts, passing grade).  
   - Integrates with **Skills Engine** and **Course Builder** to generate targeted, adaptive questions.  
   - Blocks further attempts once all allowed tries are exhausted.

---

### 🧩 Architecture Overview (Onion Architecture)

- **Frontend:** React (**JavaScript + ES6**) on **Vercel** — supports both SSR and SPA:  
  - **SSR (Server-Side Rendering):** pre-renders pages for faster first load and SEO.  
  - **SPA (Single-Page Application):** smooth navigation and instant user experience.  
  - The hybrid approach combines the benefits of both for performance and UX.

- **Backend:** Node.js (**JavaScript**) on **Railway**  
  - Core business logic, exam orchestration, and system integrations.  
  - Exposes **REST APIs** for external communication and **gRPC** for internal microservice calls *(planned for future phase)*.  
  - **Currently running in demo mode** — uses **mock JSON data sources** for exams, submissions, and user metadata.  
  - Production migration to **PostgreSQL + MongoDB** is already defined for later deployment phases.

---

### 🧱 Datastores
- **PostgreSQL** — Primary relational storage for exams, attempts, and results (ACID).  
- **MongoDB** — For logs, incidents, and proctoring evidence (flexible JSON format).  
- In **demo mode**, mock JSON files emulate these databases for local testing and early integration.

---

### 🔗 Integrations
| Service | Protocol | Role |
|:--|:--|:--|
| **Directory** | REST | Policies: max attempts, passing grades |
| **Skills Engine** | REST | Learner skills profile & AI feedback |
| **DevLab** | gRPC *(planned)* | Coding question generation |
| **Course Builder** | gRPC *(planned)* | Course content map (coverage focus) |
| **Learning Analytics** | REST | Reporting & insights |
| **HR Management** | REST | Summary reports to management |
| **Chatbot (Support)** | REST | Incident reporting only |

#### Directory Service usage
- For Baseline Exams, only the passing grade is used for per-skill evaluation.
- For Post-Course Exams, both passing grade and max attempts are used to control retake eligibility.

> 🧠 **Note:** For the MVP phase, all integrations use **REST-only** communication.  
> gRPC integrations for DevLab and Course Builder will be introduced post-deployment (Phase 10+).

---

### 🔒 Security & Quality
- OAuth2 + JWT authentication (user level)
- mTLS for service-to-service encryption *(planned)*
- Row-level org isolation (RLS in PostgreSQL)
- Encryption at rest (PostgreSQL & MongoDB)
- WCAG 2.1 AA accessibility
- TDD-first development with CI/CD gates and contract tests
- i18n support (EN / HE / AR)
- Full observability stack: logs + metrics + traces

---

### 🤖 AI Capabilities
- **Exam Generation** – Theoretical question creation (prompt templates + schema validation)  
- **Feedback Phrasing** – AI-generated feedback in the learner’s locale  
- **Audit Validation** – AI-based analysis of exam integrity and anomalies

---

## 🧭 Development Flow

This repository follows the **AI-assisted SDLC** driven by `/templates/Main-Project-Development-Flow.md`.  
Each numbered phase (01–09) produces artifacts stored under `/artifacts/`, ensuring full traceability and versioned governance.

---

## 📁 Project Structure

.
├─ templates/ # Development phase templates
│ ├─ Main-Project-Development-Flow.md # Overview of development flow
│ ├─ 01-Initial_Development_Setup.md # Phase 1: Project setup
│ ├─ 02-User_Dialogue_And_Requirements.md # Phase 2: Requirements gathering
│ ├─ 03-Feature_Planning.md # Phase 3: Feature planning
│ ├─ 04-Design_And_Architecture.md # Phase 4: System design
│ ├─ 05-Security_Compliance.md # Phase 5: Security & compliance
│ ├─ 06-AI_Design_Prompt.md # Phase 6: AI prompt creation
│ ├─ 07-Implementation.md # Phase 7: Code implementation
│ ├─ 08-Testing_And_Verification.md # Phase 8: Testing & verification
│ └─ 09-Code_Review_And_Deployment.md # Phase 9: Review & deployment
├─ artifacts/ # AI-generated outputs
│ ├─ ROADMAP.json # Project roadmap
│ └─ ... (per-phase JSONs)
├─ .gitignore # Git ignore rules
└─ README.md # This file

markdown
Copy code

---

### 🧩 Development Phases

1. **Initial Development Setup** — Environment setup  
2. **User Dialogue & Requirements** — Requirement gathering  
3. **Feature Planning** — Feature prioritization  
4. **Design & Architecture** — System design and technical specifications  
5. **Security & Compliance** — Security controls and compliance  
6. **AI Design & Prompt Engineering** — AI-assisted generation and evaluation logic  
7. **Implementation** — Code development and deployment  
8. **Testing & Verification** — Automated and manual validation  
9. **Code Review & Deployment** — Final review and production release
