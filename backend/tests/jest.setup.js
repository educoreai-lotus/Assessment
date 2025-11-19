// Ensure real timers to avoid lingering fake timers across suites
beforeAll(() => {
  if (typeof jest !== 'undefined' && jest.useRealTimers) {
    jest.useRealTimers();
  }
});

afterAll(async () => {
  // defensive: rely on globalTeardown for DB, but ensure timers are real
  if (typeof jest !== 'undefined' && jest.useRealTimers) {
    jest.useRealTimers();
  }
});


