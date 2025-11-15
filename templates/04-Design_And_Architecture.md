# Phase 04: Design & Architecture

**Template:** `04-Design_And_Architecture.md`  
**Linked Inputs:** `feature-backlog.json`, `feature-specifications.json`  
**Linked Outputs:** `system-architecture.json`, `component-specifications.json`, `api-specifications.json`, `integration-specifications.json`

---

## 🎯 Overview

This phase creates the **technical foundation** for the project by designing the architecture, defining components, selecting design patterns, and establishing data and API structures.  
It transforms approved features into a **cohesive, scalable, and secure system blueprint** ready for implementation.

---

## 👥 Roles & Responsibilities

### 🧩 System Architect

- **Primary:** Define system structure, architecture style, and technology stack.
- **Secondary:** Document architecture patterns and decision records (ADRs).
- **Validation:** Provide architecture diagrams and technical specifications.
- **Decision Authority:** Overall system architecture, technology choices, and design integrity.

### 🧠 Technical Lead

- **Primary:** Review architectural decisions, validate technical feasibility.
- **Secondary:** Provide guidance on performance, scalability, and maintainability.
- **Validation:** Confirm alignment with best practices and implementation capacity.
- **Decision Authority:** Technical feasibility and execution strategy.

### 💻 Development Team

- **Primary:** Evaluate component designs for practicality and maintainability.
- **Secondary:** Identify development constraints and risks.
- **Validation:** Confirm that designs are actionable and within technical capability.

### 👩‍💼 Product Owner

- **Primary:** Validate that architecture supports business objectives.
- **Secondary:** Approve trade-offs between performance, cost, and time.
- **Validation:** Confirm architecture meets functional and non-functional goals.

---

## 💬 Dialogue Rules

### Architectural Design Sessions

- **Collaborative:** Include architects, tech leads, and core developers.
- **Evidence-Based:** Support each decision with rationale or metrics.
- **Iterative:** Refine diagrams and specs as understanding deepens.
- **Documented:** Record all architecture decisions in ADR format.

### Design Principles

- Apply **SOLID**, **DRY**, and **KISS**.
- Favor **scalability**, **fault tolerance**, and **maintainability**.
- Optimize for **modularity** and **reusability**.
- Use **versioned diagrams** for traceability.

### Communication Guidelines

- **Visual First:** Represent designs via diagrams and models.
- **Precision:** Use clear, technical language.
- **Traceability:** Link every component and decision to requirements or features.
- **Version Control:** Update architecture files with version tags.

---

## ⚙️ Substeps & Tasks

### 1️⃣ System Architecture Design

1. Define the overall architecture (monolith, microservices, hybrid).
2. Identify major system modules and communication paths.
3. Specify architectural patterns (event-driven, layered, CQRS, etc.).
4. Document high-level diagrams (C4 Model: Context → Container → Component → Code).
5. Record rationale in `architecture-decisions.json`.

**Real SDLC Database & Integration Architecture:**

- **Database Architecture:** PostgreSQL (primary relational) and MongoDB (logs/audit) with connection pooling, replication, and backup strategies.
- **API Architecture:** REST APIs for external services, gRPC for internal microservice communication (DevLab, Course Builder).
- **Integration Points:** External service APIs, authentication services, third-party integrations with real endpoints and authentication.

**Feature-Based Architecture:**

- Each feature's architecture (backend, frontend, database) is designed and documented.
- Integration points per feature are identified and specified.
- Architecture decisions are linked to features in `ROADMAP.json`.

**Clarification Requirements:**

- **Ask user:** What external services need integration? (specify service names, endpoints, authentication methods)
- **Ask user:** What database hosting and management approach? (managed services, self-hosted, cloud providers)

### 2️⃣ Component Design

1. Define components and their boundaries.
2. Specify responsibilities, dependencies, and interaction contracts.
3. Create component diagrams and sequence flows.
4. Define data structures used internally.
5. Validate modularity and testability.

### 3️⃣ Data Architecture

**Real Database Schema Design:**

1. **PostgreSQL Schema Design:**
   - Model entities, schemas, and relationships with real table structures.
   - Define primary keys, foreign keys, indexes, and constraints.
   - Specify data types, nullability, and default values.
   - Design for ACID compliance and transaction integrity.
2. **MongoDB Collection Design:**
   - Design collections for logs, audit trails, and document storage.
   - Define document schemas and validation rules.
   - Specify indexing strategies for query performance.
3. **Data Access Patterns:**
   - Define repository patterns and data access layer.
   - Specify query patterns (reads, writes, aggregations).
   - Design connection pooling and transaction management.
4. **Migration & Versioning:**
   - Design database migration strategy (versioned migrations).
   - Plan for backup, restore, and disaster recovery.
   - Define schema versioning and rollback procedures.
5. **Feature-Specific Schemas:**
   - Design database schemas per feature.
   - Document feature-to-database mapping.
   - Store schema specifications in `artifacts/specs/{feature_id}_db.json`.
6. **Produce Artifacts:**
   - ER diagrams with real table structures.
   - Data flow diagrams showing database connections.
   - Migration scripts and database setup documentation.

**Clarification Requirements:**

- **Ask user:** What database schema design tool should be used? (e.g., Prisma, Sequelize, raw SQL migrations)
- **Ask user:** What specific database tables/collections are needed per feature?

### 4️⃣ API Design

1. Design REST/gRPC/GraphQL endpoints and contracts.
2. Define authentication, authorization, and rate-limiting.
3. Specify request/response schemas and HTTP status mapping.
4. Plan API versioning and deprecation policy.
5. Generate OpenAPI/Swagger documentation.

### Exam Flow: Difficulty Enforcement (Theoretical vs Coding)

- Theoretical questions created for any exam flow are normalized to difficulty = `medium` at the storage boundary.
- Coding questions retain their externally provided difficulty (e.g., from DevLab).
- External DevLab (non-exam) theoretical requests may include difficulty; this is only honored when routed through `TheoreticalQuestionBuilder` with `allowExternalDifficulty=true`.
- Storage mapping is handled by `examsService.buildExamPackageDoc` to enforce invariants regardless of upstream inputs.

### 5️⃣ Integration Design

**Real External Service Integration:**

1. **External Systems Identification:**
   - Identify all external systems and their real API endpoints.
   - Document authentication methods (API keys, OAuth, JWT tokens).
   - Specify service URLs, base paths, and versioning.
2. **Integration Patterns:**
   - Choose integration patterns (REST, gRPC, Pub/Sub, Webhooks, API Gateway).
   - Design service-to-service communication (internal microservices).
   - Plan for API Gateway or service mesh if needed.
3. **Error Handling & Resilience:**
   - Define error handling, retry logic, and circuit breakers.
   - Design fallback strategies and degraded mode handling.
   - Implement timeout and rate limiting policies.
4. **Observability:**
   - Design logging, metrics, and tracing for integrations.
   - Plan for monitoring external service health and latency.
   - Design alerting for integration failures.
5. **Feature-Specific Integrations:**
   - Document integration points per feature.
   - Specify which external services each feature uses.
   - Store integration specs in `artifacts/specs/{feature_id}_integrations.json`.
6. **Produce Artifacts:**
   - Integration architecture diagrams with real endpoints.
   - API contract specifications.
   - Integration test plans and sandbox configuration.

**Clarification Requirements:**

- **Ask user:** What external services need integration? (provide service names, endpoints, authentication details)
- **Ask user:** What API Gateway or service mesh solution should be used?
- **Ask user:** What monitoring and observability tools? (e.g., Prometheus, Datadog, New Relic)

---

## ✅ Validation Gates

| Gate                                 | Focus                                        | Validation Criteria                                      |
| :----------------------------------- | :------------------------------------------- | :------------------------------------------------------- |
| **1️⃣ Architecture Completeness**     | Architecture defined, components identified  | Major modules, communication paths, and diagrams created |
| **2️⃣ Component Design Quality**      | Component boundaries and contracts validated | Responsibilities, dependencies, and data models clear    |
| **3️⃣ Data Architecture Validation**  | Data structure and persistence complete      | Models, schemas, and flows documented                    |
| **4️⃣ API Design Validation**         | APIs defined, secure, and versioned          | Contracts, docs, and versioning approved                 |
| **5️⃣ Integration Design Validation** | Integrations feasible and observable         | Error handling, retry logic, and monitoring planned      |

---

## 📦 Output Artifacts

| Category                | Artifact                          | Description                                            |
| :---------------------- | :-------------------------------- | :----------------------------------------------------- |
| **System Architecture** | `system-architecture.json`        | High-level system design and principles                |
|                         | `architecture-diagrams/`          | Architecture diagrams (C4, sequence, etc.)             |
|                         | `architecture-decisions.json`     | Architectural decision records (ADRs)                  |
| **Components**          | `component-specifications.json`   | Component definitions, responsibilities, and contracts |
|                         | `component-interfaces.json`       | Interface and dependency mapping                       |
| **Data Architecture**   | `data-models.json`                | Data entities, schemas, and migrations                 |
|                         | `database-schema.json`            | Database design and normalization                      |
| **APIs**                | `api-specifications.json`         | Endpoints, payloads, and rules                         |
|                         | `api-contracts.json`              | Formal interface definitions                           |
| **Integrations**        | `integration-specifications.json` | Integration mapping and flow definitions               |
|                         | `monitoring-design.json`          | Observability, metrics, and logging design             |

---

## 🧱 Architecture Patterns

### Recommended Patterns

- **Microservices:** Scalable, decoupled systems.
- **Event-Driven:** Async communication and resilience.
- **CQRS:** Split read/write models for complex domains.
- **Repository:** Abstract persistence logic.
- **Factory:** Encapsulate object creation.
- **Observer:** Handle event subscriptions and notifications.

### Core Principles

- **Separation of Concerns:** Clear modular boundaries.
- **Dependency Inversion:** Depend on abstractions, not concretes.
- **Interface Segregation:** Keep contracts small and targeted.
- **Single Responsibility:** One reason to change.
- **Open/Closed Principle:** Extend without modifying existing logic.

---

## 🧮 Success Criteria

- Architecture diagrams complete and versioned.
- Components designed and validated by Tech Lead.
- Data architecture finalized and reviewed.
- APIs documented with authentication and contracts.
- Integration patterns confirmed and testable.
- All ADRs linked to design decisions.
- `system-architecture.json` integrated with `ROADMAP.json`.

---

## ⚠️ Error Handling & Recovery

| Issue                       | Symptom                           | Resolution                            |
| :-------------------------- | :-------------------------------- | :------------------------------------ |
| Architecture Overcomplexity | Too many layers or tight coupling | Simplify with modular decomposition   |
| Integration Failures        | Circular or unclear boundaries    | Refactor with API gateway or adapters |
| Performance Concerns        | Bottlenecks identified            | Revisit data access and caching       |
| Scalability Risks           | Growth not supported              | Introduce horizontal scaling patterns |

**Rollback:** Revert to previous validated version of `system-architecture.json` and document cause in `Hotfix_Log.json`.

---

## 🔜 Next Phase Preparation

When all gates pass:

1. System architecture and all diagrams approved.
2. Components and APIs are technically feasible.
3. Data and integration models finalized.
4. Artifacts versioned and linked in `ROADMAP.json`.
5. Team ready for **Phase 05 — Security & Compliance Planning.**

---

**Next Phase →** [`05-Security_Compliance.md`](./05-Security_Compliance.md)
