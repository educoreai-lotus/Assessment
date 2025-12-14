# Phase: UI Intro + Envelope Standardization — Scan & Map

Date: 2025-12-14

## Frontend routes and pages

- Router file: `frontend/src/main.jsx`
  - Routes:
    - `/exam/baseline` → `frontend/src/pages/Baseline.jsx`
    - `/exam/postcourse` → `frontend/src/pages/exam/PostCourseExam.jsx`
    - Other existing: `/results`, `/results/baseline`, `/results/postcourse`, `/exam/cancelled`, `/dev/health`

- Baseline page (active route target):
  - `frontend/src/pages/Baseline.jsx`

- Post-course page (active route target):
  - `frontend/src/pages/exam/PostCourseExam.jsx`

- Note: There is also `frontend/src/pages/exam/BaselineExam.jsx` present, but the router currently points baseline to `frontend/src/pages/Baseline.jsx`.

## Coordinator inbound controller/endpoint

- Main inbound controller: `backend/controllers/integrationController.js`
  - Legacy-style endpoints using `api_caller` + `stringified_json`:
    - `handlePostIntegration`
    - `handleGetIntegration`
  - Universal inbound handler (Coordinator envelope): `universalIntegrationHandler`
    - Accepts envelope and dispatches by `requester_service`

- Coordinator HTTP client (outbound): `backend/services/gateways/coordinatorClient.js`

## Existing envelope parsing/serialization (JSON.parse/stringify)

Detected relevant occurrences (subset focused on coordinator/integration paths):

- `backend/controllers/integrationController.js`
  - JSON.parse: lines 31, 316, 357, 362, 369
  - JSON.stringify: lines 333, 334, 521

- `backend/services/gateways/coordinatorClient.js`
  - JSON.stringify: line 61 (request body)

- `backend/services/gateways/skillsEngineGateway.js`
  - JSON.stringify: lines 31, 46, 68, 77, 96
  - JSON.parse: lines 32, 78

Other gateway files (directory, courseBuilder, analytics, rag, management, devlab) also stringify/parse responses. For this PR we will target controller + coordinator client for standardization; gateways can be updated incrementally in follow-ups.

## Existing “start exam” UI flow (baseline and post-course)

- Baseline:
  - `frontend/src/pages/Baseline.jsx` performs bootstrap then creates/starts exam
  - Camera preview and exam content managed within the same component

- Post-course:
  - `frontend/src/pages/exam/PostCourseExam.jsx` creates/loads exam then renders questions

There is currently no dedicated “Intro / Rules” screen gating entry.

## Files to be added/changed in this PR

Adds:
- Backend util: `backend/utils/coordinatorEnvelope.js`
- Frontend util: `frontend/src/utils/coordinatorEnvelope.js`
- Frontend page: `frontend/src/pages/ExamIntro.jsx`
- Frontend page: `frontend/src/pages/CoordinatorEntry.jsx`
- Backend test: `backend/tests/coordinator/envelope-normalization.test.js`

Edits:
- Controller (normalize & use utils): `backend/controllers/integrationController.js`
- Coordinator client (stringify via util): `backend/services/gateways/coordinatorClient.js`
- Frontend router: `frontend/src/main.jsx` (add `/exam-intro` and `/coordinator-entry` routes)
- Baseline page: `frontend/src/pages/Baseline.jsx` (redirect to intro unless accepted)
- Post-course page: `frontend/src/pages/exam/PostCourseExam.jsx` (redirect to intro unless accepted)

## Target envelope shape (post-normalization)

```json
{
  "requester_service": "...",
  "payload": { "action": "...", "...": "..." },
  "response": { "answer": "" }
}
```

Adapter rules for this PR:
- Skills Engine baseline request → `payload.action = "start-baseline-exam"`
- Course Builder post-course request (if raw object) → wrap to envelope with `payload.action = "start-postcourse-exam"`

## Notes

- The Intro page will gate entry for both baseline and post-course.
- Acceptance is stored per-attempt via `localStorage` key `introAccepted:<attemptId>`.
- Coordinator entry page will parse an `envelope` query param (URL-encoded JSON) or `localStorage.pendingEnvelope` and route to the intro with preserved params.


