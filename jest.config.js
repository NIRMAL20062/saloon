/**
 * Deliberately minimal, not `jest-expo` — the things worth unit-testing so far
 * (booking state machine, slot-overlap math) are plain TypeScript with zero
 * React Native/Expo imports, so there's no need for RN's mocking/transform
 * overhead. Pulls in `jest-expo` here the day a test needs to render a
 * component or touch an Expo module, not before (CLAUDE.md Section 7: keep
 * the 8 GB dev machine light).
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
};
