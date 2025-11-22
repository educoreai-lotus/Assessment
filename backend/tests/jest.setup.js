// Ensure real timers to avoid lingering fake timers across suites
beforeAll(() => {
  if (typeof jest !== 'undefined' && jest.useRealTimers) {
    jest.useRealTimers();
  }
});

// Mock email sender for ALL tests to avoid loading Resend and external calls
jest.mock('../utils/emailSender', () => ({
  sendEmail: jest.fn(() => Promise.resolve(true)),
  sendTestEmail: jest.fn(() => Promise.resolve(true)),
}));

afterAll(async () => {
  // defensive: rely on globalTeardown for DB, but ensure timers are real
  if (typeof jest !== 'undefined' && jest.useRealTimers) {
    jest.useRealTimers();
  }
});


