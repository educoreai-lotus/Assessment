# Main-Project-Development-Flow.md (v3.1)

---

## 🧭 GLOBAL RULES

- Operate autonomously with exception handling, escalation, and emergency hotfix fallback.//  
- Use versioned JSON objects with explicit field ownership:  
  - `"user_input"` = human answers  
  - `"system_generated"` = AI outputs  
  - `"ai_decision"` = decision + rationale (compact)  
- Append-only updates; each phase produces a new immutable JSON version.  
- Enforce **TCR-enhanced TDD** (Test → Commit → Revert) per sprint.  
- Apply the kind architicture you think is relevant **Onion Architecture**, **SOLID**, **DRY**, **KISS**, **Clean Code**.... 
- Guarantee testability, scalability, security, and deployability.  
- Maintain full audit trail and synchronized `feature_flags` (backend ↔ frontend).  
- Assume the user is non-technical — use analogies and confirm understanding.  
- Continuous **AI Evaluation Loop**: every AI feature re-validated post-deploy; failed eval → rollback or retrain.

---

### 🔒 Autonomy & Escalation Matrix

| Level | Description | Examples |
|:--|:--|:--|
| **Autonomous** | Technical design, implementation scaffolding, test generation, CI config | Internal logic and architecture |
| **Confirm with User** | Feature scope, UX, integrations, cost-impacting choices | Business logic, integrations |
| **Escalate** | Security policy, compliance, PII handling

---

### ✅ Quality Gates (applies to every phase)

| Category | Requirement |
|:--|:--|
| **Security** | Lint + dependency + secrets scan |
| **Tests** | Minimum coverage threshold (defined in Phase 7) |
| **Docs** | Artifact updated and linked in `ROADMAP.json` |
| **Traceability** | New `traceability_id` and `previous_version` recorded |

---

## ⚙️ CORE EXECUTION RULES

- Execute sequentially, one step at a time.  
- Load and execute only the referenced `.md` template.  
- Run a multi-role dialogue until consensus (except where locked).  
- Ask one clear question at a time; suggest example.  
- Never infer missing information — always ask.  
- Append or reference only; never overwrite.  
- Request explicit approval before revising prior data.  
- Generate versioned JSON capturing decisions and rationale.  
- **Rollback Triggers:** failed tests, broken dependencies, security or AI safety regression.  
- **Rollback Procedure:** revert to previous JSON version; record reason in `Hotfix_Log.json`.  
- **Log:** prompt, AI model version, dataset tag, approver.

---

### 🔐 Definition: *Locked Phases or Sections*

A **locked** phase, dialogue, or data segment is one that has reached **validated consensus** and is marked as immutable in the current version of the project.  
Locking ensures audit integrity, reproducibility, and prevents circular dependency re-discussion.

**A section or dialogue becomes “locked” when:**
1. Its outputs have passed all validation gates (tests, security, documentation).  
2. `status` in `ROADMAP.json` is set to `"Done"`.  
3. The phase has been approved by the responsible role or AI consensus validator.  
4. A corresponding artifact version (e.g., `Requirements.json@v3`) has been registered in the audit log.

**While locked:**
- AI cannot reopen the dialogue automatically.  
- Changes require explicit user or approver override (`status = "Rework"` + reason).  
- Any new proposal must create a new version (append-only) and link to the prior one via `previous_version`.

**Example:**
```json
{
  "phase": "04-Design_And_Architecture",
  "status": "Done",
  "locked": true,
  "previous_version": "v2.1",
  "approved_by": "System Architect",
  "timestamp": "2025-10-22T09:00:00Z"
}

### 🧩 Phase I/O Contract (Standard for All Phases)

Each phase template **must define**:

| Field | Description |
|:--|:--|
| **Inputs** | Prior artifacts consumed (filenames + versions) |
| **Process** | Roles, dialogue stop condition, validations |
| **Outputs** | Exact filenames + minimal JSON schemas |
| **Exit Criteria** | Quality gates passed + `ROADMAP.json` updated |
| **Rollback** | Precise revert steps + affected artifacts |

---

## 🗺️ ROADMAP & CHECKLIST CONTROL

Each phase updates `ROADMAP.json` linking:
- tasks / sub-tasks  
- dependencies / status  
- Definition of Done  
- source refs / test links  
- ownership / timestamps  

> **Note:** Cursor AI validates the roadmap before code changes.  
> Frozen (“Done”) items are editable only if `status = Rework` + reason.  
> Ensures full traceability and validation discipline.

**Minimal `ROADMAP.json` item schema:**
```json
{
  "id": "task-001",
  "title": "Short task title",
  "status": "Planned|In-Progress|Blocked|Done|Rework",
  "depends_on": ["task-000"],
  "owner": "role_or_person",
  "dod": ["criterion 1", "criterion 2"],
  "links": { "spec": "file", "tests": "file", "pr": "url" },
  "timestamps": { "created": "ISO", "updated": "ISO" },
  "traceability_id": "uuid"
}

## 📘 PHASE DIRECTORY

---

### 1️⃣ Initial Development Setup (`01-Initial_Development_Setup.md`)

**Roles:** Project Lead, System Architect, DevOps Engineer, AI Workflow Designer, Moderator, Logger  
**Sequence:** Objectives → Architecture → Environment  
**Outputs:** `Requirements.json` (initial draft)

**Exit Criteria:**  
- Repository structure initialized  
- CI stub present  
- `ROADMAP.json` created and linked  

---

### 2️⃣ User Dialogue & Requirements Analysis (`02-User_Dialogue_And_Requirements.md`)

**Roles:** Guide, Clarifier, Simplifier, Validator, Moderator, Logger  
**Rules:** Progressive disclosure (≤3 clarification loops)  
**Outputs:** `Requirements.json` (updated)

**Exit Criteria:**  
- MVP scope and acceptance criteria captured  
- Conflicts logged and resolved  

---

### 3️⃣ Feature Planning (`03-Feature_Planning.md`)

**Roles:** Product Owner, AI Analyst, Risk Manager, Validator, Moderator, Logger  
**Outputs:** `Extended_Requirements.json` (feature map, risk matrix, DoD, test links)

**Exit Criteria:**  
- Prioritized backlog with dependencies and risk levels  
- Definition of Done established per feature  

---

### 4️⃣ Design & Architecture (`04-Design_And_Architecture.md`)

**Roles:** System Architect, Security Architect, AI Architect, Performance Engineer, Moderator, Logger  
**Outputs:** `Reliability_Security.json`, `dependency_map.json`, updated `ARCHITECTURE.md`

**Exit Criteria:**  
- Interfaces frozen  
- Performance budgets defined  
- Security controls mapped  

---

### 5️⃣ Security & Compliance Planning (`05-Security_Compliance.md`)

**Roles:** Security Architect, Compliance Officer, DevOps Auditor, Logger  
**Sections:** Policies, controls, risk register, incident runbook  
**Outputs:** `SECURITY.md`, `RISK_REGISTER.json`, `IR_RUNBOOK.md`

**Exit Criteria:**  
- Controls mapped to features  
- High-risk items mitigated or accepted  

---

### 6️⃣ AI Design & Prompt Engineering (`06-AI_Design_Prompt.md`)
```
**Roles:** Lead AI Engineer, Prompt Architect, Data Curator  
**Sections:** Task → Prompt mapping, RAG, evaluation, safety, cost  
**Outputs:** `/ai/prompts/*.md `, `AI_Config.json`, `Evaluation_Suite.json`
```
**Exit Criteria:**  
- Evaluation thresholds defined  
- Safety tests validated  
- Lineage registry fields populated  

---

### 7️⃣ Implementation (`07-Implementation.md`)

**Sections:** TDD, AI integration, commit discipline, feature locking  
**Outputs:** `Code_Implementation_Roadmap.json`, `Audit_Log.json`

**Exit Criteria:**  
- All tests green  
- Coverage threshold achieved  
- Feature flags toggled as per plan  

---

### 8️⃣ Testing & Verification (`08-Testing_And_Verification.md`)

**Coverage:** Unit / Integration / E2E / Adversarial  
**Outputs:** Updated `ROADMAP.json`, `Risk_Log.json`

**Exit Criteria:**  
- Zero regression confirmed  
- Security and adversarial tests pass  
- Final sign-off recorded  

---

### 9️⃣ Code Review & Deployment (`09-Code_Review_And_Deployment.md`)

**Flow:** Peer-review → Staging → Production → Validation Checklist  
**Outputs:** Verified `ROADMAP.json`, `Risk_Log.json`

**Exit Criteria:**  
- Production deployment verified  
- Rollback tested  
- Change record linked  

---



## 🧮 LOGGING & TRACEABILITY

Every phase stores:

- `version`, `traceability_id`, `previous_version`, `source_phase`  
- `author_role`, `timestamp`  
- `raw_user_input`, `clarified_input`  
- `ai_decision` (summary + rationale), `flags` / `issues`

All artifacts link back to `ROADMAP.json`.  
The audit trail covers every decision, code change, and rollback.

---

### 🧾 Minimal `Audit_Log.json` Entry
```
json
{
  "traceability_id": "uuid",
  "phase": "07-Implementation",
  "action": "update",
  "ai_model": "gpt-5",
  "prompt_version": "p1.4",
  "dataset_tag": "internal|user|licensed|synthetic",
  "rationale": "1-2 sentence reason",
  "approver": "role_or_user",
  "timestamp": "ISO"
}
```

### ⚡ Minimal `Hotfix_Log.json` Entry
```json
{
  "traceability_id": "uuid",
  "reason": "test regression | security failure | dependency break",
  "reverted_to_version": "vX.Y",
  "owner": "role_or_user",
  "timestamp": "ISO",
  "follow_up_task": "task-123 in ROADMAP"
}
```


## 🚀 Getting Started

To begin using this framework:

1. **Start with Phase 01**: Begin with `01-Initial_Development_Setup.md`
2. **Follow Sequential Order**: Complete phases in numerical order (01-11)
3. **Validate Each Phase**: Ensure all validation gates are passed before proceeding
4. **Maintain Outputs**: Keep all generated outputs for future reference
5. **Document Changes**: Update version numbers and change logs as needed

## 📚 Framework Benefits

- **Modular**: Each phase is self-contained and executable
- **AI-Ready**: Designed for AI-human collaboration
- **Comprehensive**: Covers entire SDLC from setup to maintenance
- **Quality-Focused**: Built-in quality gates and validation
- **Traceable**: Complete audit trail and version control
- **Scalable**: Adaptable to projects of any size

---

**Next Step**: Begin with `01-Initial_Development_Setup.md` to start your project development journey.