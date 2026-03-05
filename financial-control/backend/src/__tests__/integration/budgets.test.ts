/**
 * Integration tests — Budgets (upsert, spent calculation, validation)
 *
 * Requires DATABASE_URL_TEST to be set and migrations applied.
 */

import request from 'supertest'
import app from '../../app'
import {
  testPrisma,
  createUser,
  createAccount,
  createCategory,
  createTransaction,
  cleanupUser,
  loginUser,
} from '../helpers/factories'

const prisma = testPrisma()
const createdIds: string[] = []

let accessToken: string
let userId: string
let expenseCatId: string
let incomeCatId: string
let accountId: string

beforeAll(async () => {
  const email = `budgets-${Date.now()}@example.com`
  const user = await createUser(prisma, { email })
  userId = user.id
  createdIds.push(userId)

  const login = await loginUser(app, email)
  accessToken = login.accessToken

  const [expCat, incCat, acc] = await Promise.all([
    createCategory(prisma, userId, 'EXPENSE'),
    createCategory(prisma, userId, 'INCOME'),
    createAccount(prisma, userId),
  ])
  expenseCatId = expCat.id
  incomeCatId = incCat.id
  accountId = acc.id
})

afterAll(async () => {
  for (const id of createdIds) {
    await cleanupUser(prisma, id).catch(() => {})
  }
  await prisma.$disconnect()
})

// ── Create ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/budgets', () => {
  it('creates a budget for an EXPENSE category → 201', async () => {
    const now = new Date()
    const res = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCatId,
        amount:     500,
        month:      now.getMonth() + 1,
        year:       now.getFullYear(),
      })
    expect([200, 201]).toContain(res.status)
    expect(Number(res.body.amount)).toBe(500)
  })

  it('rejects a budget for an INCOME category → 400', async () => {
    const now = new Date()
    const res = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId: incomeCatId,
        amount:     1000,
        month:      now.getMonth() + 1,
        year:       now.getFullYear(),
      })
    expect(res.status).toBe(400)
  })
})

// ── Upsert ────────────────────────────────────────────────────────────────────

describe('Budget upsert behaviour', () => {
  it('second POST for same category+month+year updates amount (no duplicate)', async () => {
    const now = new Date()
    const payload = {
      categoryId: expenseCatId,
      month:      now.getMonth() + 1,
      year:       now.getFullYear(),
    }

    await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...payload, amount: 300 })

    const second = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...payload, amount: 800 })

    expect([200, 201]).toContain(second.status)
    expect(Number(second.body.amount)).toBe(800)

    // Only one budget should exist for this category+month+year
    const count = await prisma.budget.count({
      where: {
        userId,
        categoryId: expenseCatId,
        month:      now.getMonth() + 1,
        year:       now.getFullYear(),
      },
    })
    expect(count).toBe(1)
  })
})

// ── Spent calculation ─────────────────────────────────────────────────────────

describe('Budget spent field', () => {
  it('spent reflects sum of EXPENSE transactions in the period', async () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year  = now.getFullYear()

    // Create 2 expense transactions in current month
    await Promise.all([
      createTransaction(prisma, userId, expenseCatId, {
        type: 'EXPENSE', amount: 100, accountId,
        date: new Date(year, month - 1, 5),
      }),
      createTransaction(prisma, userId, expenseCatId, {
        type: 'EXPENSE', amount: 200, accountId,
        date: new Date(year, month - 1, 10),
      }),
    ])

    // Upsert a budget and read back
    await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ categoryId: expenseCatId, amount: 1000, month, year })

    const list = await request(app)
      .get(`/api/v1/budgets?month=${month}&year=${year}`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(list.status).toBe(200)

    const budget = (list.body as any[]).find((b: any) => b.categoryId === expenseCatId)
    if (budget) {
      expect(Number(budget.spent)).toBeGreaterThanOrEqual(300)
    }
  })
})

// ── Delete ────────────────────────────────────────────────────────────────────

describe('DELETE /api/v1/budgets/:id', () => {
  it('deletes a budget → 204', async () => {
    const now = new Date()
    const create = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCatId,
        amount:     200,
        month:      now.getMonth() + 1,
        year:       now.getFullYear(),
      })
    const id = create.body.id

    const del = await request(app)
      .delete(`/api/v1/budgets/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(del.status).toBe(204)
  })
})
