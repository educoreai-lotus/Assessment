/* eslint-disable no-console */
const fetch = require('node-fetch');

const COORDINATOR_URL = process.env.COORDINATOR_URL;
const ASSESSMENT_BASE_URL = process.env.ASSESSMENT_BASE_URL;

function requireEnv(name, value) {
  if (!value || String(value).trim() === '') {
    throw new Error(`${name} is required for integration tests. Set process.env.${name}.`);
  }
  return String(value).replace(/\/+$/, '');
}

describe('DevLab ↔ Coordinator ↔ Assessment E2E flow', () => {
  jest.setTimeout(60000);

  const coordinatorBase = COORDINATOR_URL ? requireEnv('COORDINATOR_URL', COORDINATOR_URL) : requireEnv('COORDINATOR_URL', COORDINATOR_URL);
  const assessmentBase = ASSESSMENT_BASE_URL ? String(ASSESSMENT_BASE_URL).replace(/\/+$/, '') : null;

  let generatedPackage = null;

  test('#1 generate-questions returns a full package', async () => {
    const url = `${coordinatorBase}/api/fill-content-metrics`;
    const payload = {
      requester_service: 'content-studio',
      payload: {
        action: 'generate-questions',
        topic_id: '42',
        topic_name: 'JavaScript Basics',
        skills: ['arrays', 'functions'],
        humanLanguage: 'english',
        amount: 4,
        theoretical_question_type: 'multiple_choice',
      },
      response: {},
    };
    let res, json;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'devlab-service',
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      try { json = JSON.parse(text); } catch { json = { parse_error: true, raw: text }; }
      console.log('[E2E][generate-questions][status]', res.status);
      console.log('[E2E][generate-questions][json]', JSON.stringify(json, null, 2));
    } catch (err) {
      console.error('[E2E][generate-questions][error]', err);
      throw err;
    }

    expect(res.status).toBe(200);
    expect(json && json.success).toBe(true);
    expect(json && json.data && Array.isArray(json.data.questions)).toBe(true);
    expect(json.data.questions.length).toBe(4);

    // Validate structure
    for (const q of json.data.questions) {
      expect(typeof q.id).toBe('string');
      expect(typeof q.stem).toBe('string');
      expect(typeof q.html_snippet).toBe('string');
      expect(typeof q.javascript_snippet).toBe('string');
      expect(typeof q.ajax_request_example).toBe('string');
      expect(Array.isArray(q.hints)).toBe(true);
      expect(typeof q.correct_answer).toBe('string');
    }

    generatedPackage = json.data;
  });

  test('#2 grade-theoretical returns correct true/false', async () => {
    if (!generatedPackage || !Array.isArray(generatedPackage.questions) || generatedPackage.questions.length === 0) {
      throw new Error('No generated package available from Test #1');
    }
    const q = generatedPackage.questions[0];
    const url = `${coordinatorBase}/api/fill-content-metrics`;

    // Correct answer
    let res1, json1;
    try {
      res1 = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'devlab-service',
        },
        body: JSON.stringify({
          requester_service: 'content-studio',
          payload: {
            action: 'grade-theoretical',
            question_id: q.id,
            user_answer: q.correct_answer,
          },
        }),
      });
      const text = await res1.text();
      try { json1 = JSON.parse(text); } catch { json1 = { parse_error: true, raw: text }; }
      console.log('[E2E][grade-theoretical][correct][status]', res1.status);
      console.log('[E2E][grade-theoretical][correct][json]', JSON.stringify(json1, null, 2));
    } catch (err) {
      console.error('[E2E][grade-theoretical][correct][error]', err);
      throw err;
    }
    expect(res1.status).toBe(200);
    expect(json1 && json1.success).toBe(true);
    expect(json1 && json1.data && json1.data.correct === true).toBe(true);

    // Wrong answer
    let res2, json2;
    try {
      res2 = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'devlab-service',
        },
        body: JSON.stringify({
          requester_service: 'content-studio',
          payload: {
            action: 'grade-theoretical',
            question_id: q.id,
            user_answer: 'WRONG_ANSWER_EXAMPLE',
          },
        }),
      });
      const text = await res2.text();
      try { json2 = JSON.parse(text); } catch { json2 = { parse_error: true, raw: text }; }
      console.log('[E2E][grade-theoretical][wrong][status]', res2.status);
      console.log('[E2E][grade-theoretical][wrong][json]', JSON.stringify(json2, null, 2));
    } catch (err) {
      console.error('[E2E][grade-theoretical][wrong][error]', err);
      throw err;
    }
    expect(res2.status).toBe(200);
    expect(json2 && json2.success).toBe(true);
    expect(json2 && json2.data && json2.data.correct === false).toBe(true);
  });

  test('#3 Assessment health endpoint smoke test', async () => {
    const base = assessmentBase || requireEnv('ASSESSMENT_BASE_URL', ASSESSMENT_BASE_URL);
    const url = `${base}/health`;
    let res, json;
    try {
      res = await fetch(url);
      const text = await res.text();
      try { json = JSON.parse(text); } catch { json = { parse_error: true, raw: text }; }
      console.log('[E2E][assessment-health][status]', res.status);
      console.log('[E2E][assessment-health][json]', JSON.stringify(json, null, 2));
    } catch (err) {
      console.error('[E2E][assessment-health][error]', err);
      throw err;
    }
    expect(res.status).toBe(200);
    // Accept the server's actual shape; common field is status: 'ok'
    if (json && typeof json === 'object') {
      expect(json.status === 'ok' || json.ok === true).toBeTruthy();
    } else {
      throw new Error('Invalid health response shape');
    }
  });
});


