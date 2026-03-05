/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  globalSetup: './src/__tests__/helpers/testDb.ts',
  testTimeout: 30000,
  maxWorkers: 1,
  clearMocks: true,
  // NODE_ENV=test → app.ts skips app.listen (avoids EADDRINUSE between test files)
  // BCRYPT_ROUNDS=4 → speeds up the register endpoint in tests
  setupFiles: ['./src/__tests__/helpers/setEnv.ts'],
  // otplib's full ESM dependency chain (@scure/base, @noble/*) must be
  // transformed — not ignored — so Jest can parse their ESM export syntax
  transformIgnorePatterns: [
    '/node_modules/(?!(@scure|@noble|otplib|@otplib)/)',
  ],
  transform: {
    // Disable TS diagnostics for integration tests: we care about runtime
    // behaviour, not pre-existing type errors in application source files.
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
    '^.+\\.js$':   ['ts-jest', { diagnostics: false }],
  },
}
