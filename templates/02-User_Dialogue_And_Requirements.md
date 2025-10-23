# Phase 02: User Dialogue & Requirements Analysis  
**Template:** `02-User_Dialogue_And_Requirements.md`  
**Linked Outputs:** `Requirements.json` (updated) | `Stakeholder_Analysis.json`

---

## 🎯 Overview
This phase focuses on **eliciting, analyzing, and validating** user and business requirements through a structured, multi-role dialogue.  
It converts stakeholder knowledge into precise, testable specifications — establishing the **single source of truth** for all subsequent phases.

---

## 👥 Roles & Responsibilities

### 🤖 AI Requirements Analyst
- **Primary:** Lead structured dialogue sessions and extract requirements  
- **Secondary:** Analyze and document for completeness and consistency  
- **Validation:** Ensure each requirement is measurable and unambiguous  
- **Decision Authority:** Requirement clarity and documentation quality  

### 👩‍💼 Human Stakeholder (Product Owner)
- **Primary:** Provide business goals, priorities, and constraints  
- **Secondary:** Review and validate AI-interpreted requirements  
- **Validation:** Approve final specification  
- **Decision Authority:** Business value, scope, and acceptance criteria  

### 👥 End Users
- **Primary:** Supply experiential and usability feedback  
- **Secondary:** Validate user stories and acceptance tests  
- **Validation:** Confirm requirements reflect real user needs  
- **Decision Authority:** UX accuracy and feasibility  

### 🧠 Technical Lead
- **Primary:** Evaluate technical feasibility and dependencies  
- **Secondary:** Highlight constraints and risks  
- **Validation:** Confirm requirements are achievable  
- **Decision Authority:** Technical feasibility and dependency validation  

---

## 💬 Dialogue Rules

### Structured Interview Protocol
- Begin with **open-ended questions** to explore goals  
- Use **follow-ups** to refine assumptions  
- Apply up to 3 **clarification loops** to resolve ambiguity  
- End each topic with a **validated restatement**

### Requirement Elicitation Techniques
- **User Stories:** Express features from the user’s view  
- **Use Cases:** Describe detailed interaction flows  
- **Personas:** Model key user types and motivations  
- **Journey Maps:** Visualize end-to-end experience  

### Communication Guidelines
- **Active Listening:** Mirror understanding before recording  
- **Plain Language:** Avoid jargon; use business terms  
- **Visual Aids:** Employ diagrams or mockups for clarity  
- **Traceability:** Document all inputs in versioned artifacts  

---

## ⚙️ Substeps & Tasks

### 1️⃣ Stakeholder Identification
1. Identify and list all stakeholders  
2. Map relationships, influence, and responsibilities  
3. Prioritize stakeholders by impact and interest  
4. Schedule interview sessions  
5. Prepare stakeholder-specific interview guides  

### 2️⃣ Requirements Discovery
1. Conduct stakeholder interviews or workshops  
2. Collect business goals and success metrics  
3. Capture functional requirements  
4. Document non-functional requirements  
5. Record assumptions and external dependencies  

### 3️⃣ Requirements Analysis
1. Evaluate completeness and consistency  
2. Detect conflicts or duplications  
3. Prioritize by business value and risk  
4. Assess technical feasibility  
5. Validate testability  

### 4️⃣ Requirements Documentation
1. Compile `requirements-specification.md`  
2. Write user stories with acceptance criteria  
3. Document use cases and alternate flows  
4. Generate Requirements Traceability Matrix (RTM)  
5. Create summary report  

### 5️⃣ Requirements Validation
1. Present draft to stakeholders  
2. Conduct validation sessions  
3. Gather feedback and apply controlled changes  
4. Obtain end-user confirmation  
5. Record formal stakeholder sign-off  

---

## ✅ Validation Gates

### Gate 1 – Stakeholder Coverage
- [ ] All stakeholders identified and interviewed  
- [ ] Requirements captured for each stakeholder  
- [ ] Priorities defined and approved  
- [ ] Communication plan documented  
- [ ] Stakeholder sign-off on coverage  

### Gate 2 – Requirements Completeness
- [ ] Business, functional, and non-functional requirements recorded  
- [ ] Constraints and assumptions captured  
- [ ] No gaps or duplicates remain  
- [ ] Traceability matrix links all sources  

### Gate 3 – Requirements Quality
- [ ] Requirements clear, atomic, and testable  
- [ ] Conflicts resolved / dependencies mapped  
- [ ] Prioritization complete  
- [ ] Technical feasibility approved  

### Gate 4 – Documentation Quality
- [ ] Specification document complete  
- [ ] User stories + acceptance criteria validated  
- [ ] Use cases + journey maps linked to personas  
- [ ] RTM and summary report generated  

### Gate 5 – Stakeholder Validation
- [ ] Requirements reviewed and signed off  
- [ ] Feedback incorporated  
- [ ] End-user validation recorded  
- [ ] Change-management process active  

---

## 📦 Output Artifacts

| Category | Artifact | Purpose |
|:--|:--|:--|
| **Stakeholder Analysis** | `stakeholder-analysis.json` | Stakeholder mapping and influence matrix |
| | `stakeholder-interviews.json` | Interview transcripts and insights |
| | `stakeholder-priorities.json` | Weighted priority matrix |
| | `stakeholder-communication-plan.md` | Communication strategy |
| **Requirements Docs** | `requirements-specification.md` | Master requirements document |
| | `business-requirements.json` | Structured business objectives |
| | `functional-requirements.json` | Functional scope definition |
| | `non-functional-requirements.json` | System qualities and constraints |
| **User Stories & Use Cases** | `user-stories.json` | User stories with acceptance criteria |
| | `use-cases.json` | Scenario flows and alternatives |
| | `user-personas.json` | Persona profiles and motivations |
| | `user-journey-maps.json` | Experience maps |
| **Analysis & Validation** | `requirements-analysis.json` | Analytical review |
| | `requirements-priorities.json` | Ranked list |
| | `technical-feasibility-assessment.json` | Feasibility report |
| **Approvals & Governance** | `requirements-validation-report.json` | Validation summary |
| | `stakeholder-feedback.json` | Feedback log |
| | `requirements-approval.json` | Sign-off record |
| | `change-management-process.md` | Controlled change workflow |

---

## 🧩 Templates & Structures

### 🧱 User Story Template
```text
As a [User Type],  
I want [Functionality]  
So that [Business Value]  

**Acceptance Criteria:**  
- [ ] Criterion 1  
- [ ] Criterion 2  
- [ ] Criterion 3  

**Definition of Done:**  
- [ ] Feature implemented  
- [ ] Tests passing  
- [ ] Documentation updated  
- [ ] Code reviewed

🧾 Use Case Template
**Use Case:** [Name]  
**Actor:** [Primary Actor]  
**Goal:** [Actor’s Goal]  
**Preconditions:** [System state before execution]  

**Main Flow:**  
1. [Step 1]  
2. [Step 2]  
3. [Step 3]  

**Alternative Flows:**  
- [Alternative 1]  
- [Alternative 2]  

**Postconditions:** [System state after execution]

Next Phase → 03-Feature_Planning.md