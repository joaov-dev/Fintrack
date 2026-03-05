/**
 * Jest globalSetup — runs once before all integration tests.
 *
 * Connects to DATABASE_URL_TEST, verifies the connection, and exposes
 * a shared Prisma client for the test suite.
 *
 * Each test file is responsible for cleaning up its own data via
 * afterEach / afterAll to keep tests isolated.
 *
 * Required env var: DATABASE_URL_TEST
 * Example (.env.test): DATABASE_URL_TEST="postgresql://user:pass@localhost:5432/financial_control_test"
 */

import { PrismaClient } from '@prisma/client'

// Override DATABASE_URL with the test-specific URL during integration tests
export default async function globalSetup() {
  const testUrl = process.env.DATABASE_URL_TEST
  if (!testUrl) {
    throw new Error(
      '[testDb] DATABASE_URL_TEST is required for integration tests.\n' +
      'Add it to your .env.test file or set it in the environment.',
    )
  }
  // Point Prisma to the test database for this process
  process.env.DATABASE_URL = testUrl

  const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } })
  try {
    await prisma.$connect()
    // Verify the schema is up-to-date by checking a core table exists
    await prisma.user.count()
    console.log('[testDb] Connected to test database ✓')
  } catch (err) {
    throw new Error(
      `[testDb] Failed to connect to test DB (${testUrl}): ${(err as Error).message}\n` +
      'Run: npx prisma migrate deploy with DATABASE_URL_TEST set.',
    )
  } finally {
    await prisma.$disconnect()
  }
}
