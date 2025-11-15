# 📄 Clarifications & Refinements Log

**Purpose:** Maintain a detailed, structured record of all clarifications, refinements, and adjustments across all phases and features.

**Rules:**

- Always append; never delete or modify existing entries.
- Each refinement must be specific and actionable.
- All templates must review relevant refinements before execution and append new ones after.
- Entries are organized by feature and then by layer (backend/frontend/database).

---

## Structure

Each feature section follows this format:

```markdown
## Feature: [Feature Name] (Feature ID: F-XXX)

### Backend

- [YYYY-MM-DD] Description of clarification or refinement
  - Phase: [Phase Number]
  - Traceability ID: [UUID]
  - Rationale: [Why this change was made]

### Frontend

- [YYYY-MM-DD] Description of clarification or refinement
  - Phase: [Phase Number]
  - Traceability ID: [UUID]
  - Rationale: [Why this change was made]

### Database

- [YYYY-MM-DD] Description of clarification or refinement
  - Phase: [Phase Number]
  - Traceability ID: [UUID]
  - Rationale: [Why this change was made]

### Integration

- [YYYY-MM-DD] Description of clarification or refinement
  - Phase: [Phase Number]
  - Traceability ID: [UUID]
  - Rationale: [Why this change was made]
```

---

## Global Clarifications

### System Architecture

- [2025-01-XX] System upgraded to real SDLC-level with production-grade database connections and API integrations
  - Phase: N/A (System-wide upgrade)
  - Traceability ID: system-upgrade-v4.0
  - Rationale: Evolve from prototype/mock-data level to production-grade SDLC framework

### Database Configuration

- [2025-01-XX] PostgreSQL configured as primary relational database with connection pooling
  - Phase: 01, 04, 07
  - Traceability ID: db-config-postgres
  - Rationale: Production-grade data persistence requirement

- [2025-01-XX] MongoDB configured for logs and audit trails
  - Phase: 01, 04, 07
  - Traceability ID: db-config-mongo
  - Rationale: Document storage for logs and audit data

### Integration Architecture

- [2025-01-XX] REST APIs used for external service communication
  - Phase: 04, 07
  - Traceability ID: integration-rest
  - Rationale: Standard API integration pattern

- [2025-01-XX] gRPC used for internal microservice communication (DevLab, Course Builder)
  - Phase: 04, 07
  - Traceability ID: integration-grpc
  - Rationale: High-performance internal service communication

---

## Feature-Specific Clarifications

_Feature-specific clarifications will be appended here as features are developed and refined._

---

## Feature: Exam Questions (Feature ID: FEAT-EXAM-QUESTIONS)

### Backend

- [2025-11-15] Normalize theoretical question difficulty and sanitize prompt
  - Phase: 07
  - Traceability ID: feat-exam-questions-difficulty-normalization
  - Rationale: Ensure consistent learner experience and prevent upstream difficulty leakage; preserve external difficulty only for DevLab non-exam requests.

### Frontend

- [2025-11-15] No UI changes required (metadata normalization is backend-only)
  - Phase: 07
  - Traceability ID: feat-exam-questions-frontend-nop
  - Rationale: Difficulty policy enforced at storage layer; UI consumes normalized metadata.

### Database

- [2025-11-15] No schema change; enforcement at service layer
  - Phase: 07
  - Traceability ID: feat-exam-questions-db-nop
  - Rationale: Rule implemented via mapping and builder logic.

### Integration

- [2025-11-15] DevLab external theoretical requests may carry difficulty (opt-in)
  - Phase: 07
  - Traceability ID: feat-exam-questions-devlab-external
  - Rationale: Allow DevLab calibration and validation scenarios without impacting exam consistency.

## Notes

- All clarifications should be timestamped with ISO date format (YYYY-MM-DD).
- Each entry should reference the phase where it was made and include a traceability ID.
- When clarifications impact multiple features, add them to both feature sections or create a shared section.
- Questions that need user input should be marked with **[QUESTION]** prefix.

---

## Feature: Proctoring (Feature ID: FEAT-PROCTORING)

### Backend

- [2025-11-15] Enforce camera activation prior to exam start via ProctoringSession
  - Phase: 07
  - Traceability ID: feat-proctoring-camera-activation
  - Rationale: Ensure proctoring readiness; block exam start until camera is active.

- [2025-11-15] Auto-cancel attempt on third focus violation; block start
  - Phase: 07
  - Traceability ID: feat-proctoring-focus-violation-auto-cancel
  - Rationale: Deter cheating; provide deterministic cancellation policy.

### Frontend

- [2025-11-15] Surface camera requirement and activation flow
  - Phase: 07
  - Traceability ID: feat-proctoring-frontend-indicator
  - Rationale: Inform user to activate camera before proceeding.

### Database

- [2025-11-15] Add Mongo collection proctoring_sessions
  - Phase: 07
  - Traceability ID: feat-proctoring-mongo-session
  - Rationale: Persist camera status and basic proctoring session state for attempts.

- [2025-11-15] Add Mongo collection proctoring_violations and PG status for attempts
  - Phase: 07
  - Traceability ID: feat-proctoring-violations-and-pg-status
  - Rationale: Track violations and persist cancellation in the source of truth.

### Integration

- [2025-11-15] Align proctoring event ingestion with existing ProctoringEvent model
  - Phase: 07
  - Traceability ID: feat-proctoring-event-alignment
  - Rationale: Keep future event flows consistent with current data model.
