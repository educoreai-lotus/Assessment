🧩 EduCore AI – Assessment Microservice

🔗 FINAL INTEGRATION MAP (AFTER YOUR NEW UPDATES)



🟩 1️⃣ DIRECTORY

Purpose: Provides official policy (passing grade + max attempts); receives exam completion metadata.

📥 Assessment → Directory (you CALL them)

Method

Endpoint

Purpose

Payload

GET

/api/directory/policy/:exam_type

Fetch exam policy values

—

POST

/api/directory/exam-results

Push completion metadata after submission

{ exam_id, attempt_id, user_id, attempt_no, exam_type, final_grade, passing_grade, passed, submitted_at }



📤 Directory → Assessment: 🚫 None (they never call you).



🟦 2️⃣ SKILLS ENGINE

Purpose: Starts baseline exam and receives skill updates after any exam (baseline or post-course).

 Now also receives the coverage map + final status for post-course exams.

📤 Skills Engine → Assessment (they CALL you)

Method

Endpoint

Purpose

Payload

POST

/api/assessment/integration

Start baseline exam

{ "api_caller": "skills_engine", "stringified_json": "{\"user_id\":\"u_123\",\"user_name\":\"Jane Doe\",\"skills\":[{\"skill_id\":\"s_html\"}],\"passing_grade\":70}" }



Assessment uses this to →

create baseline exam (exam_type = baseline)

store policy snapshot (passing_grade)

generate questions per skill and begin exam



📥 Assessment → Skills Engine (you CALL them)

Method

Endpoint

Purpose

Payload

POST

/api/skills-engine/assessment-results

Send skill status updates after grading

{ user_id, exam_type, passing_grade, final_grade, passed, skills:[{ skill_id, skill_name, score, status }], coverage_map:[{ lesson_id, skills:[skill_id] }], final_status:"completed" }



🟨 3️⃣ COURSE BUILDER

Purpose: Starts post-course exam and receives results.

 Also can grant one extra attempt only (after max is reached).

📤 Course Builder → Assessment (they CALL you)

Method

Endpoint

Purpose

Payload

POST

/api/assessment/integration

Start post-course exam

{ "api_caller":"course_builder","stringified_json":"{\"learner_id\":\"u_123\",\"learner_name\":\"Jane Doe\",\"course_id\":\"c_789\",\"course_name\":\"Intro to JS\",\"coverage_map\":[{\"lesson_id\":\"L101\",\"skills\":[\"s_js_async\",\"s_js_promises\"]}],\"passing_grade\":70,\"max_attempts\":3}" }

POST

/api/assessment/integration

Grant one extra attempt for a learner (retry approval)

{ "api_caller":"course_builder","stringified_json":"{\"learner_id\":\"u_123\",\"course_id\":\"c_789\",\"update_type\":\"extra_attempt\",\"approved_by\":\"course_builder\"}" }



Assessment uses this to →

start exam or unlock only one new attempt (attempt_no = previous + 1)

keep original max_attempts from Directory unchanged

log the event in outbox_integrations for audit



📥 Assessment → Course Builder (you CALL them)

Method

Endpoint

Purpose

Payload

POST

/api/course-builder/exam-results

Send course-level exam results after grading

{ user_id, course_id, exam_type:"postcourse", passing_grade, final_grade, passed, attempt_no }



🟧 4️⃣ DEVLAB

Purpose: Handles coding and theoretical question exchange.

📤 DevLab → Assessment (they CALL you)

Method

Endpoint

Purpose

Payload

POST

/api/assessment/integration

Send coding questions or request theoretical ones

Coding → { "api_caller":"devlab","stringified_json":"{\"questions\":[{\"qid\":\"devlab_q42\",\"type\":\"code\",\"difficulty\":\"medium\",\"skill_id\":\"s_js_async\",\"lesson_id\":\"L101\",\"stem\":\"Write an async function…\",\"expected_output\":\"{data:…}\",\"correct_answer\":\"async function fetchData(url){…}\"}]}" }

Theoretical → { "api_caller":"devlab","stringified_json":"{\"difficulty\":\"hard\",\"nano_skills\":[\"s_html\"],\"micro_skills\":[\"s_js_async\"]}" }



📥 Assessment → DevLab (you CALL them)

Method

Endpoint

Purpose

Payload

POST

/api/devlab/theoretical

Send AI-generated theoretical question

{ exam_id, attempt_id, difficulty, question:{ type, stem, choices, correct_answer, hints } }

POST

/api/devlab/results

Send graded results for coding questions

{ attempt_id, results:[{ qid, score, status }] }



🟫 5️⃣ LEARNING ANALYTICS

Purpose: Pulls summarized results (no questions / answers) for dashboards.

 Uses GET.

Method

Endpoint

Purpose

Query Example

GET

/api/assessment/integration?api_caller=learning_analytics&stringified_json={"attempt_id":"att_9m1x"}

Request summarized attempt data

—



Response:

{

  "user_id":"u_123",

  "exam_type":"postcourse",

  "course_id":"c_789",

  "course_name":"Intro to JS",

  "attempt_no":1,

  "passing_grade":70,

  "max_attempts":3,

  "final_grade":82,

  "passed":true,

  "skills":[

    {"skill_id":"s_html","skill_name":"HTML Structure","score":85,"status":"acquired"},

    {"skill_id":"s_js_async","skill_name":"Asynchronous Programming","score":78,"status":"acquired"}

  ],

  "submitted_at":"2025-11-07T16:48:22Z"

}



🟥 6️⃣ MANAGEMENT (Reporting & HR)

Purpose: Pulls official records for compliance. (GET)

Method

Endpoint

Purpose

Query Example

GET

/api/assessment/integration?api_caller=management&stringified_json={"attempt_id":"att_9m1x"}

Request exam record for compliance

—



Response:

{

  "user_id":"u_123",

  "course_id":"c_789",

  "exam_type":"postcourse",

  "attempt_no":1,

  "passing_grade":70,

  "final_grade":82,

  "passed":true

}



🟪 7️⃣ RAG (Chatbot)

Purpose: Reports learner incidents → receives decisions.

Direction

Method

Endpoint

Purpose

Payload

RAG → Assessment

POST

/api/assessment/integration

Report incident

{ "api_caller":"rag","stringified_json":"{\"source\":\"rag_service\",\"exam_id\":\"ex_51a2\",\"attempt_id\":\"att_9m1x\",\"user_id\":\"u_123\",\"incident_type\":\"technical_error\",\"messages\":[\"page froze\"]}" }

Assessment → RAG

POST

/api/rag/incident-response

Send decision (continue / retake / rejected)

{ exam_id, attempt_id, user_id, decision, message }



🎥 8️⃣ PROTOCOL CAMERA

Purpose: Monitors exam integrity and receives final summary.

Direction

Method

Endpoint

Purpose

Payload

Protocol Camera → Assessment

POST

/api/assessment/integration

Send proctoring event

{ "api_caller":"protocol_camera","stringified_json":"{\"exam_id\":\"ex_51a2\",\"attempt_id\":\"att_9m1x\",\"user_id\":\"u_123\",\"event_type\":\"tab_switch\",\"timestamp\":\"2025-11-07T16:20:15Z\",\"severity_score\":2,\"resolution_status\":\"unresolved\"}" }

Assessment → Protocol Camera

POST

/api/protocol-camera/summary

Send final summary

{ attempt_id, summary:{ events_total, violations, terminated } }


