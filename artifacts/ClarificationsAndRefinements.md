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

## Phase 07.6.3 – Navbar & Logo Fix (Tailwind Consistency and Asset Resolution)

- [2025-11-12] Fixed Navbar positioning and logo resolution
  - Phase: 07.6.3
  - Traceability ID: phase-07-6-3-navbar-logo-fix
  - Changes: Navbar is fixed at top with Tailwind-native backgrounds and shadow; page content padded to avoid overlap; logo rendering uses Vite public root paths with correct casing and transitions
  - Rationale: Ensure consistent visual alignment and reliable branding assets across themes

## Phase 07.6.4 – Logo Path Correction and Verification

- [2025-11-12] Verified and enforced Vite public asset references
  - Phase: 07.6.4
  - Traceability ID: phase-07-6-4-logo-path-correction
  - Rule: All static branding assets in Vite should be referenced via absolute public paths (e.g., `/logo-day.jpeg`, `/logo-night.jpeg`) with exact filename casing as committed under `frontend/public/`
  - Validation: Confirmed files exist, ensured `Navbar.jsx` uses absolute paths, and built the app to verify resolution

## Phase 07.6.5 – Logo Asset Rebuild & Cache Invalidation

- [2025-11-12] Migrated branding assets to PNG and enforced cache-safe references
  - Phase: 07.6.5
  - Traceability ID: phase-07-6-5-logo-cache-invalidation
  - Rule: Prefer `.png` for favicon/branding images to avoid cross-environment decoding issues; update absolute `/public` references and clear local build cache before deployment
  - Validation: Cleared local Vite cache, rebuilt, and prepared for Vercel redeploy

## Phase 07.6.6 – Static Asset Cache Purge and Redeploy

- [2025-11-12] Forced CDN refresh via clean build and push
  - Phase: 07.6.6
  - Traceability ID: phase-07-6-6-cdn-purge-redeploy
  - Guidance: Pushing to a Vercel-connected `main` branch triggers a fresh deployment which invalidates stale CDN entries for updated public assets (e.g., `/logo-day.png`, `/logo-night.png`); alternatively, use Vercel CLI `--force` deploy with a non-interactive token in CI
  - Validation: Logged expected 200 responses and UI theme behavior in `artifacts/Validation_Report_Phase08.md`

## Phase 07.6.7 – Asset Inclusion Verification & Forced Sync

- [2025-11-12] Ensured logo PNG assets are tracked and built on Vercel
  - Phase: 07.6.7
  - Traceability ID: phase-07-6-7-asset-inclusion-verification
  - Rule: Always explicitly track critical `/public` assets in Git to guarantee their presence in Vercel builds; reference them via absolute paths (e.g., `/logo-day.png`) to avoid bundler path rewrites
  - Validation: Forced add/commit of PNG assets and push to `main`; verification appended in `artifacts/Validation_Report_Phase08.md`

## Phase 07.6.8 – Logo Sizing & Alignment Adjustment

- [2025-11-12] Standardized responsive logo sizing and alignment
  - Phase: 07.6.8
  - Traceability ID: phase-07-6-8-logo-sizing-alignment
  - Behavior: Branding uses `flex items-center gap-2` with hover scale; logo sizes `h-8 sm:h-10 md:h-12 w-auto object-contain mr-2` to maintain balance alongside the “Assessment” label across breakpoints

## Phase 07.6.7 – Frontend Theme Finalization

- [2025-11-12] Verified Dark Emerald theme consistency and dependency sync
  - Phase: 07.6.7
  - Traceability ID: phase-07-6-7-frontend-theme-finalization
  - Notes: Visual consistency verified across light/dark modes; no functional regressions; lockfile synced for deterministic builds

## Phase 08.1 – Database Connectivity Restoration (Railway)

- [2025-11-12] Environment variable mapping for DBs on Railway
  - Phase: 08.1
  - Traceability ID: phase-08-1-db-connectivity-restoration
  - Rule: Accept multiple env names to accommodate platform defaults
    - Postgres: `SUPABASE_DB_URL || POSTGRES_URL || DATABASE_URL`
    - Mongo: `MONGO_DB_URI || MONGO_URI`
  - Guidance: Ensure values are valid connection strings (postgres://..., mongodb+srv://...) and set in Railway project variables

## Phase 08.3 – Database Schema and Health Route Repair

- [2025-11-12] PG enum and Mongo health adjustments
  - Phase: 08.3
  - Traceability ID: phase-08-3-db-schema-health-repair
  - Decisions:
    - Run idempotent PG enum creation at startup for `exam_type` with values `baseline`, `postcourse`
    - Use Mongo `listCollections().toArray()` for health safety; include collection count in payload
    - Drop deprecated `mongoose.connect` options to suppress warnings

