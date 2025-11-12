# Clarifications & Refinements (Baseline) — EduCore AI – Assessment Microservice

> version: v4.3.1 • traceability_id: clarifications-v4-3-1-seed • source: README.md (v4.3.1) + templates (v4.0)
> rule: append-only; add dated entries per feature/layer with phase reference

---

## Global Clarifications

### System Architecture
- [2025-11-11] Adopt dual-database pattern: PostgreSQL (ACID attempts/results) + MongoDB (logs, proctoring, AI audit)
  - Phase: 04
  - Traceability ID: global-arch-dual-db
  - Rationale: Structured grading data vs. flexible integrity/audit data

### Governance
- [2025-11-11] Enforce append-only records and AI lineage tracking across assessments
  - Phase: 05
  - Traceability ID: global-governance-append-lineage
  - Rationale: Auditability and compliance

### Attempts Policy
- [2025-11-11] Directory is the source of truth for passing_grade and max_attempts
  - Phase: 03
  - Traceability ID: attempts-directory-sot
  - Rationale: Central policy control and consistency

---

## Feature: Baseline Exam (Feature ID: FEAT-BASELINE-EXAM)

### Backend
- [2025-11-11] Generate theoretical + coding questions (medium) via DevLab; store exam package in MongoDB
  - Phase: 07
  - Traceability ID: baseline-devlab-gen
  - Rationale: Balanced difficulty and flexible storage

### Database
- [2025-11-11] Store graded outcomes and per-skill results in PostgreSQL; AI lineage in MongoDB
  - Phase: 07
  - Traceability ID: baseline-db-split
  - Rationale: Transactional grades vs. audit logs

### Integration
- [2025-11-11] Send per-skill statuses to Skills Engine; expose full package to Learning Analytics on request
  - Phase: 07
  - Traceability ID: baseline-results-routing
  - Rationale: Downstream consumption patterns

---

## Feature: Post-Course Exam (Feature ID: FEAT-POST-COURSE-EXAM)

### Backend
- [2025-11-11] Enforce attempts with lockout on reaching max_attempts unless Course Builder grants override
  - Phase: 07
  - Traceability ID: postcourse-attempt-policy
  - Rationale: Policy compliance

### Integration
- [2025-11-11] Distribute results: Directory (completion), Course Builder (final), Skills Engine (per-skill + coverage), HR (summary)
  - Phase: 07
  - Traceability ID: postcourse-results-routing
  - Rationale: Contracted data flows

---

## Feature: DevLab Integration (Feature ID: FEAT-DELAB)

### Backend
- [2025-11-11] Accept coding question payloads; store in exam_packages.questions[] (MongoDB); suppress hints in learner view
  - Phase: 07
  - Traceability ID: devlab-ingest-store
  - Rationale: Maintain question integrity

### Integration
- [2025-11-11] Provide theoretical question samples with hints for DevLab validation; log to ai_audit_trail
  - Phase: 07
  - Traceability ID: devlab-outbound-validate
  - Rationale: Quality loop with lineage

---

## Feature: Proctoring (Protocol Camera) (Feature ID: FEAT-PROCTORING)

### Backend
- [2025-11-11] Auto-terminate an attempt on three violations; persist events in MongoDB; summarize to PostgreSQL attempt record
  - Phase: 07
  - Traceability ID: proctoring-violations-policy
  - Rationale: Exam integrity enforcement

---

## Feature: Incident Handling (RAG) (Feature ID: FEAT-INCIDENTS)

### Backend
- [2025-11-11] If incident warrants retake, mark is_counted_as_attempt=false; store in MongoDB; ack to RAG
  - Phase: 07
  - Traceability ID: incident-retake-policy
  - Rationale: Fairness and auditability

---

## Phase Execution Notes (01–09)

- [2025-11-11] Phase 01 executed; initialized baseline artifacts and roadmap links
  - Phase: 01
  - Traceability ID: p01-exec-2025-11-11
  - Rationale: Seed structure per v4.0 flow

- [2025-11-11] Phase 02 executed; mapped requirements to initial feature backlog
  - Phase: 02
  - Traceability ID: p02-exec-2025-11-11
  - Rationale: Prepare backlog for planning

- [2025-11-11] Phase 03 executed; prioritized features and dependencies
  - Phase: 03
  - Traceability ID: p03-exec-2025-11-11
  - Rationale: Enable roadmap-driven execution

- [2025-11-11] Phase 04 executed; aligned architecture with dual-DB and integrations
  - Phase: 04
  - Traceability ID: p04-exec-2025-11-11
  - Rationale: Establish contracts and patterns

- [2025-11-11] Phase 05 executed; defined security, risk, and compliance baselines
  - Phase: 05
  - Traceability ID: p05-exec-2025-11-11
  - Rationale: Embed controls early

- [2025-11-11] Phase 06 executed; defined AI orchestration and safety rules
  - Phase: 06
  - Traceability ID: p06-exec-2025-11-11
  - Rationale: Govern AI autonomy

- [2025-11-11] Phase 07 executed; implementation plan and CI/CD baseline recorded
  - Phase: 07
  - Traceability ID: p07-exec-2025-11-11
  - Rationale: Prepare build and integrations

- [2025-11-11] Phase 08 executed; testing strategy and readiness artifacts seeded
  - Phase: 08
  - Traceability ID: p08-exec-2025-11-11
  - Rationale: Ensure quality gates

- [2025-11-11] Phase 09 executed; deployment plan and logs framework appended
  - Phase: 09
  - Traceability ID: p09-exec-2025-11-11
  - Rationale: Validate release path

---

## Phase 07.4 – API & Integration Layer (Full Integration Build)

- [2025-11-11] Unified inbound integration endpoint implemented at `/api/assessment/integration` (POST, GET) per Integration Map
  - Phase: 07.4
  - Traceability ID: phase-07-4-full-integration-build
  - Rationale: Single, deterministic contract for Skills Engine, Course Builder, DevLab, RAG, Protocol Camera, Learning Analytics, and Management

- [2025-11-11] Outbound integration service clients scaffolded (Directory, Skills Engine, Course Builder, DevLab, RAG, Protocol Camera)
  - Phase: 07.4
  - Traceability ID: phase-07-4-service-clients
  - Rationale: Decouple external calls behind environment-based service adapters

- [2025-11-11] Swagger auto-generation mounted at `/docs` with spec written to `backend/swagger/swagger.json`
  - Phase: 07.4
  - Traceability ID: phase-07-4-swagger
  - Rationale: Ensure discoverable, versioned API surface

- [2025-11-11] AI Prompt Engine templates created at `ai/prompts/assessment_prompts.md`
  - Phase: 07.4
  - Traceability ID: phase074-ai-prompt-engine
  - Rationale: Standardized prompts for generation, grading, and feedback with auditability

---

## Phase 07.6 – Frontend UI Components

- [2025-11-12] Vite + React frontend scaffolded in `/frontend` with Tailwind (darkMode: 'class')
  - Phase: 07.6
  - Traceability ID: phase-07-6-frontend-ui-components
  - Rationale: Production-ready SPA for assessments and integrations

- [2025-11-12] Implemented pages and routing
  - Pages: Home, BaselineExam, PostCourseExam, ResultsDashboard, Dev/Health
  - Routes: `/`, `/exam/baseline`, `/exam/postcourse`, `/results`, `/dev/health`
  - Components: Navbar, QuestionCard, CodingPanel, ProctoringLog, IncidentViewer, LoadingSpinner
  - Styling: Dark-Emerald gradients, rounded cards, soft shadows, motion transitions

- [2025-11-12] API wiring
  - Base URL: `import.meta.env.VITE_API_BASE_URL` (fallback to production URL when `.env` is unavailable)
  - Endpoints: `/api/exam/start`, `/api/exam/submit`, `/api/analytics/exams`, `/api/reporting/summary`, `/api/integrations/devlab`, `/api/integrations/protocol-camera`, `/api/integrations/rag`
  - Health verification page renders HTTP statuses and payloads for 3 checks

---

## Phase 07.6.0a – Theme Variable Injection

- [2025-11-12] Injected Dark Emerald CSS variable system
  - Phase: 07.6.0a
  - Traceability ID: phase-07-6-0a-theme-variables
  - Scope: Appended global CSS variables and classes (day-mode, night-mode, accessibility) into `frontend/src/index.css` without altering existing Tailwind visuals; no automatic body class applied

## Phase 07.6.1 – Branding & Theme Enhancement

- [2025-11-12] Applied branding and theme controls
  - Phase: 07.6.1
  - Traceability ID: phase-07-6-1-branding-theme-toggle
  - Changes: Replaced favicon with `/public/logo-night.jpeg`; updated title to “EduCore AI – Assessment Center”; Navbar now shows day/night logo and “Assessment” label; added theme toggle (🌞/🌙) with localStorage persistence switching `day-mode`/`night-mode` on body
  - Rationale: Establish consistent visual identity with accessible, persistent theming

## Phase 07.6.2 – Tailwind-Native Theme Toggle & Logo Fix

- [2025-11-12] Migrated to Tailwind-native dark/light theming
  - Phase: 07.6.2
  - Traceability ID: phase-07-6-2-tailwind-native-theme
  - Changes: Removed reliance on custom CSS day/night variables for toggling; now using Tailwind `dark` class on `<html>` for global control; Navbar toggle updates `localStorage('theme')` and switches logos (`logo-day.jpeg`/`logo-night.jpeg`) reactively
  - Styling: Light mode uses `bg-white text-gray-800`; Dark mode uses `bg-slate-900 text-emerald-300`; cards styled with Tailwind dark variants while retaining Dark Emerald gradients/shadows
  - Rationale: Simpler, framework-native theming with predictable composition and fewer global overrides

