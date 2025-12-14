const {
  buildProctoringSummaryPayload,
} = require('../../../services/integrations/payloadBuilders/protocolCamera.payload');

describe('payloadBuilders/protocolCamera', () => {
  test('summary payload maps attempt and summary', () => {
    const out = buildProctoringSummaryPayload({
      attempt: { attempt_id: 5, exam_id: 12 },
      summary: { strikes: 1 },
    });
    expect(out).toMatchObject({
      action: 'proctoring-summary',
      attempt_id: 5,
      exam_id: 12,
    });
    expect(out.summary).toEqual({ strikes: 1 });
  });
});


