/**
 * Jest setupFiles — runs before each test file, before any module is loaded.
 * Sets environment variables needed by the application under test.
 */
process.env.NODE_ENV      = 'test'
process.env.BCRYPT_ROUNDS = '4'
