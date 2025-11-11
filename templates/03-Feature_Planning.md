# Phase 03: Feature Planning  
**Template:** `03-Feature_Planning.md`  
**Linked Inputs:** `Requirements.json` (updated), stakeholder artifacts from Phase 02  
**Linked Outputs:** `feature-backlog.json`, `feature-specifications.json`, `feature-dependencies.json`, `feature-priorities.json`, `release-planning.json`

---

## 🎯 Overview
Transform validated requirements into a **structured, prioritized, and testable feature backlog** with clear technical specifications, user stories, and release planning. This phase creates actionable work items that bridge business intent and technical implementation.

---

## 👥 Roles & Responsibilities

### 🤖 AI Feature Planner
- **Primary:** Decompose requirements into features and stories; draft acceptance criteria.  
- **Secondary:** Propose technical specs at a high level.  
- **Validation:** Ensure features are implementable and testable.  
- **Decision Authority:** Feature structure & documentation quality.

### 👩‍💼 Product Owner
- **Primary:** Prioritize by business value and outcomes.  
- **Secondary:** Validate scope and acceptance criteria.  
- **Validation:** Approve backlog order and MVP selection.  
- **Decision Authority:** Business value, scope trade-offs.

### 🧠 Technical Lead
- **Primary:** Assess technical complexity and dependencies.  
- **Secondary:** Define technical constraints and solution approach.  
- **Validation:** Confirm feasibility and interfaces.  
- **Decision Authority:** Architecture fit & technical risk.

### 💻 Development Team
- **Primary:** Estimate effort; surface implementation details and risks.  
- **Secondary:** Suggest alternative designs when needed.  
- **Validation:** Confirm stories are actionable and INVEST-compliant.

---

## 💬 Dialogue Rules
- **Collaborative:** Include PO, Tech Lead, and Devs in planning sessions.  
- **Structured:** Requirements → Features → Stories → Estimates → Priorities.  
- **Evidence-based:** Use data (historical velocity, risk, complexity).  
- **Iterative:** Revisit estimates after risk spikes or design changes.  
- **Traceable:** Link every feature/story to its originating requirement (RTM).

---

## ⚙️ Substeps & Tasks

### 1️⃣ Feature Identification
1. Parse `Requirements.json` to extract candidate features.  
2. Group related requirements; define **clear feature boundaries**.  
3. Identify cross-feature and external **dependencies**.  
4. Capture explicit **non-goals** to prevent scope creep.  
5. Produce the initial feature list with IDs.

### 2️⃣ User Story Creation
1. Convert features into user stories (INVEST).  
2. Define **acceptance criteria** per story (Given/When/Then where useful).  
3. Apply reusable **story templates** for consistency.  
4. Validate stories with PO and representative end users.  
5. Refine based on feedback; mark blocked items with reasons.

### 3️⃣ Technical Specification
1. **Feature-Based Technical Specs:**
   - Draft technical requirements per feature (APIs, data models, constraints).
   - Map each feature to database schemas (PostgreSQL tables, MongoDB collections).
   - Identify API endpoints and external service integrations per feature.
   - Define data flow per feature (inputs → processing → outputs → integrations).
2. **Database & Integration Specifications:**
   - Specify database models and schemas per feature.
   - Identify external API endpoints and integration requirements.
   - Document authentication and authorization requirements.
3. Propose interface contracts and error semantics.  
4. Note performance, security, and observability needs.  
5. Record technical **assumptions** and **open questions** in `clarificationsAndRefinements.md`.  
6. Link to upstream/downstream services and schemas.
7. **Initialize ROADMAP.json Features:**
   - Create feature entries in `ROADMAP.json` with feature_id, name, status, and traceability_id.
   - Map features to phases they will progress through.
   - Store feature specifications in `artifacts/specs/{feature_id}_spec.json`.

### 4️⃣ Effort Estimation
1. Run estimation (Planning Poker / Story Points / T-shirt).  
2. Capture **rationale** and **confidence levels** (Low/Med/High).  
3. Flag **high-risk** or **spike** candidates.  
4. Reconcile large variance; re-estimate after clarifications.  
5. Produce **capacity-aware** estimates (consider team velocity).

### 5️⃣ Backlog Prioritization & Release Planning
1. Apply prioritization framework (e.g., WSJF / RICE / Value-Risk).  
2. Balance **business value**, **technical risk**, **dependencies**, and **UX impact**.  
3. Select **MVP scope**; define cut lines and non-MVP items.  
4. Create milestone/release plan with target windows.  
5. **Publish Feature-Based Backlog:**
   - Publish the **prioritized feature backlog** in `feature-backlog.json`.
   - Update `ROADMAP.json` with all features in prioritized order.
   - Link features to their database schemas, API endpoints, and integration points.
   - Initialize feature status tracking (Planned, In-Progress, Done, Blocked).

---

## ✅ Validation Gates

### Gate 1 — Feature Completeness
- [ ] All requirements mapped to features (no gaps/duplicates).  
- [ ] Feature boundaries and non-goals documented.  
- [ ] Dependencies identified and linked.

### Gate 2 — Story Quality
- [ ] Stories are **INVEST** and traceable to features/requirements.  
- [ ] Acceptance criteria defined and testable for each story.  
- [ ] Blockers labeled with owner and unblocking condition.

### Gate 3 — Technical Specification
- [ ] APIs, data models, and contracts drafted.  
- [ ] Non-functional needs (perf/security/observability) captured.  
- [ ] Feasibility approved by Technical Lead.

### Gate 4 — Estimation Integrity
- [ ] Estimates recorded with rationale & confidence.  
- [ ] High-variance items revisited or marked for spikes.  
- [ ] Capacity/velocity considered.

### Gate 5 — Prioritization & Roadmap
- [ ] Framework applied consistently (document method/inputs).  
- [ ] MVP defined; cut lines documented.  
- [ ] Release plan created; dependencies respected.  
- [ ] Product Owner approval recorded.

---

## 📦 Output Artifacts

### 1) Feature Documentation
- **`feature-backlog.json`** — Prioritized backlog with IDs, status, owners.  
- **`feature-specifications.json`** — Per-feature specs: goals, scope, interfaces, NFRs.  
- **`feature-dependencies.json`** — Graph/adjacency of feature and external deps.  
- **`feature-boundaries.md`** — Boundaries, non-goals, and rationale.

### 2) User Stories
- **`user-stories.json`** — Stories with acceptance criteria and traceability links.  
- **`story-templates.json`** — Canonical templates to ensure consistency.  
- **`acceptance-criteria.json`** — Central list for reuse and auditing.  
- **`story-validation.json`** — Results of PO/end-user validation.

### 3) Technical Specs
- **`technical-specifications.json`** — APIs, models, constraints, observability.  
- **`api-specifications.json`** — Endpoint contracts (method, schema, errors).  
- **`data-models.json`** — Entities, relations, invariants, migration notes.  
- **`technical-constraints.json`** — Known limits, performance budgets.

### 4) Estimation & Risk
- **`effort-estimates.json`** — Estimates, rationale, and confidence.  
- **`estimation-rationale.json`** — Method used, participants, assumptions.  
- **`risk-assessment.json`** — Risk register with severity/likelihood/mitigation.  
- **`planning-assumptions.json`** — Assumptions and open questions.

### 5) Prioritization & Roadmap
- **`feature-priorities.json`** — Ranked features with framework scores.  
- **`release-planning.json`** — Milestones, capacity, dependencies.  
- **`backlog-management.md`** — Policies for refinement, re-estimation, and changes.

---

## 🧩 Templates

### Feature Template
```text
Feature ID: FEAT-###
Name: [Feature Name]
Goal: [Outcome/Business Goal]
Scope: [In/Out]
Non-Goals: [Explicitly not included]
Dependencies: [Features/Services/Teams]
Risks: [Key risks + mitigation]
Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2

Technical Notes:
- API(s): [Contract references]
- Data: [Entities/schemas impacted]
- NFRs: [Perf/Sec/Observability targets]
User Story Template
text
Copy code
Story ID: STORY-###
As a [User Type],
I want [Functionality],
So that [Business Value].

Acceptance Criteria:
- [ ] Given/When/Then 1
- [ ] Given/When/Then 2

Definition of Done:
- [ ] Code complete
- [ ] Tests passing (unit/integration/E2E)
- [ ] Documentation updated
- [ ] Reviewed & merged
Traceability:
- Requirement: REQ-###
- Feature: FEAT-###


🔜 Next Phase Preparation

When all gates pass:

feature-backlog.json and feature-specifications.json approved by PO & Tech Lead.

MVP + release plan published; dependencies sequenced.

All artifacts linked in ROADMAP.json.
Ready to proceed to Phase 04 — Design & Architecture.
