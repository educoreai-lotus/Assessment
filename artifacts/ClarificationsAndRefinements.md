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


