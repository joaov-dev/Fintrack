/**
 * Test data factories — create realistic test fixtures with sensible defaults.
 *
 * All helpers accept an optional `overrides` object to customise individual fields.
 * Emails are unique per call so tests don't conflict with each other.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import type { Application } from 'express'

// ── Shared Prisma client pointing at DATABASE_URL_TEST ────────────────────────

export function testPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL
  return new PrismaClient({ datasources: { db: { url } } })
}

// ── Unique ID generator ───────────────────────────────────────────────────────

let _counter = 0
export function uid(): string {
  return `${Date.now()}-${++_counter}`
}

// ── User ──────────────────────────────────────────────────────────────────────

// Deliberately unusual — avoids HIBP "pwned password" detection in the register endpoint
export const DEFAULT_PASSWORD = 'Zt7#mQpX!v9Lw2Rn'

export async function createUser(
  prisma: PrismaClient,
  overrides: { name?: string; email?: string; password?: string } = {},
) {
  const id = uid()
  const password = overrides.password ?? DEFAULT_PASSWORD
  const passwordHash = await bcrypt.hash(password, 4) // low rounds = fast tests
  return prisma.user.create({
    data: {
      name:         overrides.name  ?? `Test User ${id}`,
      email:        overrides.email ?? `test-${id}@example.com`,
      passwordHash,
    },
  })
}

// ── Account ───────────────────────────────────────────────────────────────────

export async function createAccount(
  prisma: PrismaClient,
  userId: string,
  overrides: { name?: string; type?: string; initialBalance?: number } = {},
) {
  return prisma.account.create({
    data: {
      userId,
      name:           overrides.name           ?? 'Conta Corrente',
      type:           (overrides.type ?? 'CHECKING') as any,
      initialBalance: overrides.initialBalance  ?? 0,
    },
  })
}

// ── Category ──────────────────────────────────────────────────────────────────

export async function createCategory(
  prisma: PrismaClient,
  userId: string,
  type: 'INCOME' | 'EXPENSE' = 'EXPENSE',
  overrides: { name?: string } = {},
) {
  const id = uid()
  return prisma.category.create({
    data: {
      userId,
      type,
      name:  overrides.name ?? `Category ${id}`,
      color: '#6366f1',
      icon:  'tag',
    },
  })
}

// ── Transaction ───────────────────────────────────────────────────────────────

export async function createTransaction(
  prisma: PrismaClient,
  userId: string,
  categoryId: string,
  overrides: {
    amount?: number
    type?: 'INCOME' | 'EXPENSE'
    description?: string
    date?: Date
    accountId?: string
    isRecurring?: boolean
    recurrenceType?: string
  } = {},
) {
  const id = uid()
  return prisma.transaction.create({
    data: {
      userId,
      categoryId,
      accountId:     overrides.accountId   ?? null,
      type:          (overrides.type ?? 'EXPENSE') as any,
      amount:        overrides.amount       ?? 100,
      description:   overrides.description  ?? `Transaction ${id}`,
      date:          overrides.date         ?? new Date(),
      isRecurring:   overrides.isRecurring  ?? false,
      recurrenceType: overrides.recurrenceType ? (overrides.recurrenceType as any) : null,
    },
  })
}

// ── Budget ────────────────────────────────────────────────────────────────────

export async function createBudget(
  prisma: PrismaClient,
  userId: string,
  categoryId: string,
  overrides: { amount?: number; month?: number; year?: number } = {},
) {
  const now = new Date()
  return prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId,
        month: overrides.month ?? now.getMonth() + 1,
        year:  overrides.year  ?? now.getFullYear(),
      },
    },
    update: { amount: overrides.amount ?? 500 },
    create: {
      userId,
      categoryId,
      amount: overrides.amount ?? 500,
      month:  overrides.month  ?? now.getMonth() + 1,
      year:   overrides.year   ?? now.getFullYear(),
    },
  })
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export interface LoginResult {
  accessToken: string
  cookie: string
}

export async function loginUser(
  app: Application,
  email: string,
  password: string = DEFAULT_PASSWORD,
): Promise<LoginResult> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200)

  const cookie = (res.headers['set-cookie'] as string[] | undefined)?.[0] ?? ''
  const accessToken: string = res.body.accessToken
  return { accessToken, cookie }
}

// ── Cleanup helpers ───────────────────────────────────────────────────────────

/**
 * Deletes ALL rows for a given userId across the main tables.
 * Use in afterEach/afterAll to keep tests isolated.
 */
export async function cleanupUser(prisma: PrismaClient, userId: string) {
  // Cascade-safe order: children before parents
  await prisma.transactionAttachment.deleteMany({ where: { userId } })
  await prisma.transaction.deleteMany({ where: { userId } })
  await prisma.budget.deleteMany({ where: { userId } })
  await prisma.category.deleteMany({ where: { userId } })
  await prisma.account.deleteMany({ where: { userId } })
  await prisma.session.deleteMany({ where: { userId } })
  await prisma.user.delete({ where: { id: userId } }).catch(() => { /* already gone */ })
}
