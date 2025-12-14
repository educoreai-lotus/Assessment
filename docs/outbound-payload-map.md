# Outbound Payload Map (Assessment → External via Coordinator or Direct)

Date: 2025-12-14

## Targets and call sites

### Skills Engine
- File: `backend/services/gateways/skillsEngineGateway.js`
  - Function: `safeFetchBaselineSkills(params)`
  - When: fetching baseline skills (coordinator)
  - Current payload shape (payload): `{ action: 'fetch-baseline-skills', ...params }`
  - Function: `safePushAssessmentResults(payload)`
  - When: pushing baseline exam results (coordinator)
  - Current payload shape (payload): `{ action: 'baseline-exam-result', ...payload }`

### Course Builder
- File: `backend/services/gateways/courseBuilderGateway.js`
  - Function: `safeFetchCoverage(params)`
  - When: fetching coverage map for user/course (coordinator)
  - Current payload: `{ action: 'fetch-coverage-map', ...params }`
  - Function: `sendCourseBuilderExamResults(payloadObj)`
  - When: pushing postcourse exam results (coordinator)
  - Current payload: `{ action: 'postcourse-exam-result', ...payloadObj }`

### Directory
- File: `backend/services/gateways/directoryGateway.js`
  - Function: `fetchPolicy(examType, userId, courseId)`
  - When: fetch policy for baseline/postcourse (coordinator)
  - Current payload: `{ action: 'fetch-policy', exam_type, user_id, course_id }`
  - Function: `safePushExamResults(payload)`
  - When: optional push of results (coordinator)
  - Current payload: `{ action: 'push-exam-results', ...payload }`

### DevLab
- File: `backend/services/gateways/devlabGateway.js`
  - Function: `requestCodingQuestions({ amount, skills, humanLanguage, difficulty })`
  - When: build coding questions for exam (coordinator)
  - Current payload: `{ action: 'coding', amount, difficulty, humanLanguage, programming_language, skills }`
  - Function: `sendCodingGradeEnvelope(payloadObj)`
  - When: push coding answers for grading (coordinator)
  - Current payload: passthrough; expected includes `action: 'grade-coding'` etc.

### Protocol Camera
- File: `backend/services/gateways/protocolCameraGateway.js`
  - Function: `safeSendSummary(payload)`
  - When: push proctoring summary (direct axios → Protocol Camera)
  - Current payload: `{ service_requester: 'Assessment', payload: {...}, response: {} }` (direct HTTP, not coordinator)
  - Function: `startSession({ attempt_id })`
  - When: start camera session (direct axios or mock)
  - Current payload: `{ service_requester: 'Assessment', payload: { attempt_id }, response: {} }`

Notes:
- Coordinator routes based on `requester_service` and payload `action`.
- For Protocol Camera, outbound is currently direct; builders are still provided to standardize shape.


