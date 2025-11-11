# 07 - Implementation

## Purpose
Execute the development work based on the established design and architecture.

## Checklist
- [ ] Development environment configured
- [ ] Code implementation started
- [ ] Unit tests written
- [ ] Integration testing completed
- [ ] Code documentation updated
- [ ] Performance optimization applied

## Template Content
This template guides the implementation phase of the project.
# Phase 07: Implementation & Development
**Template:** `07-Implementation.md`  
**Linked Inputs:** `ai-integration-plan.json`, `automation-design.json`, `system-architecture.json`  
**Linked Outputs:** `src/`, `tests/`, `docs/`, `quality-reports/`, `ROADMAP.json`

---

## ⚙️ Overview
This phase executes the **actual build process**.  
AI agents and developers collaborate to transform design artifacts and specifications into running, testable code.  
Every implementation step — from source generation to integration — follows the predefined templates, safety rules, and validation logic from previous phases.

---

## 👥 Roles & Responsibilities

### 🤖 AI Development Assistant
- **Primary:** Generate and assemble code modules from templates.  
- **Secondary:** Conduct static analysis and recommend optimizations.  
- **Validation:** Ensure implementation matches architecture and test coverage thresholds.  
- **Decision Authority:** Code generation scope, optimization, and re-generation triggers.

### 💻 Development Team
- **Primary:** Review and refine AI-generated code.  
- **Secondary:** Extend and customize logic as required.  
- **Validation:** Guarantee correctness, maintainability, and performance.  
- **Decision Authority:** Merge approval and release readiness.

### 🧠 Technical Lead
- **Primary:** Oversee technical direction, patterns, and compliance.  
- **Secondary:** Audit architecture adherence and CI/CD quality gates.  
- **Validation:** Confirm alignment with Onion layers and domain boundaries.  
- **Decision Authority:** Final sign-off for implementation integrity.

### 🧩 Quality Assurance
- **Primary:** Define test coverage, automation rules, and quality metrics.  
- **Secondary:** Validate that generated and manual code meet compliance.  
- **Validation:** Approve test gates and security validation.  
- **Decision Authority:** Quality acceptance and release certification.

---

## 💬 Dialogue Rules
- **Iterative Execution:** Each code unit is generated, validated, and approved before proceeding.  
- **Test-First:** AI generates tests before code (TCR-enhanced TDD).  
- **Autonomous Development:** GPT executes templates, developers review and sign-off.  
- **Versioned Logs:** Every commit is auto-tagged with phase, file scope, and validation outcome.  

---

## ⚙️ Substeps & Tasks

### 1️⃣ Environment & Pipeline Setup

**Real SDLC Environment Context:**
- **Database Connections:** PostgreSQL (primary relational) and MongoDB (logs/audit) configured with connection pooling.
- **External Integrations:** REST APIs for external services, gRPC for internal microservice communication (DevLab, Course Builder).
- **Frontend:** React (JavaScript + ES6) on Vercel — hybrid SSR + SPA.
- **Backend:** Node.js (JavaScript + ES6) on Railway — REST API + AI hooks.
- **Environment Variables:** Database credentials, API keys, and service URLs managed via `.env` and secrets management.

**Tasks:**
1. Configure development containers with database connections (PostgreSQL, MongoDB).  
2. Set up environment variables for database credentials, API keys, and external service URLs.  
3. Register feature branches and link to `ROADMAP.json` (feature-based structure).  
4. Connect AI automation hooks to repository.  
5. Validate linting, static analysis, and secret scanning tools.  
6. Configure database connection pooling and retry logic.  
7. Set up CI/CD pipelines with database migration support.  
8. Store results in `ci-cd/config.json` and environment configuration in `artifacts/environment-spec.json`.

**Clarification Requirements:**
- **Ask user:** Which PostgreSQL and MongoDB hosting services? (e.g., AWS RDS, MongoDB Atlas, Supabase, Railway)
- **Ask user:** What external APIs need to be integrated? (e.g., authentication services, payment gateways, third-party APIs)
- **Ask user:** What environment variable naming convention should be used?

### 2️⃣ Core Implementation

**Real Database & Integration Implementation:**
1. Generate domain, application, and infrastructure layers following Onion Architecture.  
2. Implement core business logic per architecture spec.  
3. **Database Layer:**
   - Create database connection modules (PostgreSQL client, MongoDB client).
   - Implement database models and schemas.
   - Generate database migration scripts (using tools like Knex.js, Sequelize, or Prisma for PostgreSQL).
   - Create persistence adapters/repositories for database operations.
   - Implement transaction management and error handling.
4. **API Layer:**
   - Auto-generate REST endpoints with input validation.
   - Implement gRPC service definitions and handlers (for internal microservices).
   - Add authentication middleware (JWT, OAuth, API keys as specified).
   - Implement rate limiting and request validation.
5. **External Service Integration:**
   - Implement HTTP clients for external REST APIs.
   - Add retry logic and circuit breakers for external calls.
   - Implement service discovery and health checks.
   - Validate integration with authentication and directory services.

**Clarification Requirements:**
- **Ask user:** Which ORM/database toolkit should be used? (e.g., Prisma, Sequelize, TypeORM, Mongoose)
- **Ask user:** What authentication mechanism? (JWT, OAuth 2.0, API keys)
- **Ask user:** What external services need integration? (specify endpoints and authentication requirements)

### 3️⃣ Feature Implementation

**Feature-Based Implementation:**
1. **Execute per feature from `ROADMAP.json`:**
   - For each feature in the `features` array, implement backend, frontend, and database layers.
   - Reference feature specifications from `feature-backlog.json` and architecture specs.
   - Track progress by updating feature status in `ROADMAP.json`.
2. **Backend Implementation per Feature:**
   - Implement database models and migrations for feature-specific tables/collections.
   - Create API endpoints (REST/gRPC) with real database queries.
   - Implement business logic with database transactions.
   - Add external service integration code as needed.
   - Log refinements to `clarificationsAndRefinements.md` when clarifications are needed.
3. **Frontend Implementation per Feature:**
   - Generate UI components with API client integration.
   - Implement real API calls (not mock data) to backend endpoints.
   - Add error handling and loading states.
   - Integrate with authentication and session management.
4. **Database Implementation per Feature:**
   - Create feature-specific database schemas.
   - Implement indexes and constraints.
   - Add database-level validation and triggers if needed.
   - Create migration scripts for feature database changes.
5. **AI-Driven Features:**
   - Integrate AI services (OpenAI, Anthropic, etc.) with real API calls.
   - Implement database storage for AI prompts, responses, and evaluation data.
   - Add AI service error handling and fallback mechanisms.
6. **Documentation & Tracking:**
   - Validate feature linking in `ROADMAP.json` (update feature phases as work progresses).
   - Document all endpoints and dependencies in `/docs/api/`.
   - Append feature-specific clarifications to `clarificationsAndRefinements.md` when needed.

**Clarification Requirements:**
- **Ask user:** For each feature, what specific database schema is needed?
- **Ask user:** What AI prompts or logic should power AI-driven features?
- **Ask user:** What external API endpoints should each feature integrate with?

### 4️⃣ Testing Implementation

**Real Integration Testing:**
1. **Unit Tests:**
   - Generate unit tests for business logic, models, and utilities.
   - Mock database connections and external API calls for isolation.
   - Achieve ≥80% code coverage.
2. **Integration Tests:**
   - **Database Integration Tests:** Use test database instances (PostgreSQL, MongoDB) with test data.
   - Test database queries, transactions, and migrations.
   - **API Integration Tests:** Test REST endpoints with real database connections.
   - Test gRPC services with real data flow.
   - **External Service Integration Tests:** Use sandbox/test environments for external APIs.
   - Test error handling and retry logic.
3. **End-to-End Tests:**
   - Generate E2E suites with real database and external service connections (test environments).
   - Test complete user workflows from frontend to database.
   - Validate data flow through all layers.
4. **Feature-Specific Tests:**
   - Test each feature's backend, frontend, and database layers.
   - Store test results per feature in `tests/features/{feature_id}/`.
5. **CI/CD Pipeline:**
   - Create CI pipelines with database setup/teardown for integration tests.
   - Run automated testing and coverage reports on every commit.
   - Output results to `quality-reports/test-results.json` and feature-specific test reports.

**Clarification Requirements:**
- **Ask user:** What test database setup strategy? (Docker containers, separate test databases, in-memory for some tests)
- **Ask user:** Which external services provide sandbox/test environments?

### 5️⃣ Code Quality & Review
1. Enforce linting, code review, and peer validation.  
2. Refactor AI-generated code for clarity and maintainability.  
3. Validate coverage (≥ 80%) and performance thresholds.  
4. Document API and component usage.  
5. Store summary in `quality-reports/code-review.json`.

---

## ✅ Validation Gates

| Gate | Focus | Validation Criteria |
|:--|:--|:--|
| **1️⃣ Environment Setup** | Tooling and pipelines ready | CI/CD passes dry run |
| **2️⃣ Core Implementation** | Architecture components built | Data, domain, infra layers aligned |
| **3️⃣ Feature Implementation** | Features implemented and linked | UI/API integrated and tested |
| **4️⃣ Testing Implementation** | Automated tests running | 80 %+ coverage, CI validation |
| **5️⃣ Code Quality** | Reviews, docs, and optimization complete | Approved for deployment |

---

## 📦 Output Artifacts

| Category | Artifact | Description |
|:--|:--|:--|
| **Source Code** | `src/` | All code modules (domain + infra + UI) |
|  | `components/`, `services/`, `models/`, `utils/` | Layered code organization |
| **Tests** | `tests/unit/`, `integration/`, `e2e/`, `performance/` | Automated test suites |
| **Reports** | `quality-reports/` | Lint, test, and performance results |
| **Config** | `config/`, `docker/`, `ci-cd/` | Environment, container, and pipeline files |
| **Docs** | `docs/` | Developer, deployment, and API documentation |

---

## 🧩 Implementation Best Practices

### Code Standards
- Use consistent, descriptive naming conventions.  
- Follow Onion Architecture and SOLID principles.  
- Apply explicit error handling and logging.  
- Implement security controls (input validation, auth, encryption).  
- Maintain parity between frontend and backend contracts.

### Testing Strategy
- **Unit:** Validate each class/function independently.  
- **Integration:** Test internal API and DB communication.  
- **E2E:** Validate user scenarios and workflows.  
- **Performance:** Track latency, throughput, and memory.  
- **Security:** Validate against OWASP top 10 risks.

### Development Workflow
- Create feature branches per ticket.  
- Run tests before committing (TCR rule).  
- Merge via reviewed pull requests.  
- Maintain auto-deploy to staging.  
- Log build status and validation output in `ROADMAP.json`.

---

## 🧮 Success Criteria
- All code generated and validated per spec with real database and API integrations.  
- Database connections verified and working (PostgreSQL, MongoDB).  
- External service integrations tested and functional.  
- Test coverage ≥ 80% with all gates passing (including database and API integration tests).  
- Security checks and quality analysis complete.  
- Documentation and release notes generated.  
- `ROADMAP.json` updated with feature progress and build metadata.  
- Feature-specific clarifications logged in `clarificationsAndRefinements.md`.  
- System deployable to staging or test environment with real database connections.

---

## ⚠️ Error Handling & Recovery

| Issue | Symptom | Resolution |
|:--|:--|:--|
| Missing Implementation | Feature skipped or partial | Re-trigger AI generation for the phase |
| Failing Tests | Build blocked | Fix failing components and rerun pipeline |
| Integration Mismatch | API or schema conflict | Regenerate API clients and update schemas |
| Quality Regression | Code smells or low coverage | Refactor and enforce linting rules |

**Rollback:** Restore last passing build from CI artifacts and record cause in `Hotfix_Log.json`.

---

## 🔜 Next Phase Preparation
When all gates pass:
1. All implemented features validated and merged.  
2. Test coverage and code quality confirmed.  
3. Documentation generated and linked to `ROADMAP.json`.  
4. System prepared for **comprehensive validation**.  
5. Team ready for **Phase 08 — Testing & Verification.**

---

**Next Phase →** [`08-Testing_And_Verification.md`](./08-Testing_And_Verification.md)
