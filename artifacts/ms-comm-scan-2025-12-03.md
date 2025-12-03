# Assessment Microservice — Internal MS-to-MS Calls Scan (2025-12-03)

Scope: Search for any direct HTTP requests to EduCore microservices (Directory, Skills Engine, Course Builder, DevLab, Learning Analytics). External APIs (OpenAI, Proctoring/Protocol Camera, Resend, Supabase, MongoDB) are excluded.

## Findings

- File: `backend/services/gateways/directoryGateway.js`
  - Target: Directory Service
  - Purpose: Fetch exam policy (passing_grade, max_attempts)
  - Original snippet (pre-change):

```javascript
const url = `${base}/api/directory/policy/${encodeURIComponent(examType)}`;
const { data } = await axios.get(url, { timeout: 10000 });
```

  - Purpose: Push exam results on submission (post-course)
  - Original snippet (pre-change):

```javascript
const url = `${base}/api/directory/exam-results`;
const envelope = { service_requester: 'Assessment', payload, response: {} };
const { data } = await axios.post(url, envelope, { timeout: 15000 });
```

- File: `backend/services/gateways/skillsEngineGateway.js`
  - Target: Skills Engine
  - Purpose: Fetch baseline readiness skills
  - Original snippet (pre-change):

```javascript
const url = `${base}/api/skills-engine/baseline-readiness`;
const { data } = await axios.get(url, { params, timeout: 10000 });
```

  - Purpose: Push assessment results (baseline/post-course)
  - Original snippet (pre-change):

```javascript
const url = `${base}/api/skills-engine/assessment-results`;
const envelope = { service_requester: 'Assessment', payload, response: {} };
const { data } = await axios.post(url, envelope, { timeout: 15000 });
```

- File: `backend/services/gateways/courseBuilderGateway.js`
  - Target: Course Builder
  - Purpose: Fetch course coverage map for learner/course
  - Original snippet (pre-change):

```javascript
const url = `${base}/api/course-builder/coverage`;
const { data } = await axios.get(url, { params, timeout: 10000 });
```

  - Purpose: Push course-level exam results (post-course)
  - Original snippet (pre-change):

```javascript
const url = process.env.INTEGRATION_COURSEBUILDER_FILL_METRICS_URL;
const { data } = await axios.post(url, body, { timeout: 15000 });
```

- File: `backend/services/gateways/devlabGateway.js`
  - Target: DevLab
  - Purpose: Request coding questions; send coding grading
  - Original snippet (pre-change):

```javascript
const url = process.env.INTEGRATION_DEVLAB_DATA_REQUEST_URL;
const envelope = { service_requester: 'Assessment', payload, response: {} };
const { data } = await axios.post(url, envelope, { timeout: 20000 });
```

## Summary

- Direct internal calls identified in 4 gateway modules.
- No internal calls found outside gateways (controllers/services delegate to gateways).
- External APIs (OpenAI, Protocol Camera, RAG) are not part of this refactor.


