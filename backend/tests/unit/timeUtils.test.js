const { computeRemainingSeconds, isExpired } = require('../../services/core/timeUtils');

describe('timeUtils', () => {
  test('computeRemainingSeconds returns non-negative countdown', () => {
    const exp = new Date(Date.now() + 5500).toISOString();
    const sec = computeRemainingSeconds(exp);
    expect(sec).toBeGreaterThanOrEqual(0);
    expect(sec).toBeLessThanOrEqual(6);
  });

  test('isExpired true when past', () => {
    const exp = new Date(Date.now() - 1000).toISOString();
    expect(isExpired(exp)).toBe(true);
  });

  test('isExpired false when future', () => {
    const exp = new Date(Date.now() + 10000).toISOString();
    expect(isExpired(exp)).toBe(false);
  });
});


