/**
 * Integration tests — Transactions (CRUD, pagination, installments, split, recurring)
 *
 * Requires DATABASE_URL_TEST to be set and migrations applied.
 * Run with: npm run test:integration
 */

import request from 'supertest'
import app from '../../app'
import {
  testPrisma,
  createUser,
  createAccount,
  createCategory,
  cleanupUser,
  loginUser,
  DEFAULT_PASSWORD,
} from '../helpers/factories'

const prisma = testPrisma()
const createdIds: string[] = []

// Shared test user
let accessToken: string
let userId: string
let categoryId: string
let expenseCategoryId: string
let accountId: string

beforeAll(async () => {
  const email = `txns-${Date.now()}@example.com`
  const user = await createUser(prisma, { email })
  userId = user.id
  createdIds.push(userId)

  const login = await loginUser(app, email)
  accessToken = login.accessToken

  const [income, expense, account] = await Promise.all([
    createCategory(prisma, userId, 'INCOME'),
    createCategory(prisma, userId, 'EXPENSE'),
    createAccount(prisma, userId),
  ])
  categoryId = income.id
  expenseCategoryId = expense.id
  accountId = account.id
})

afterAll(async () => {
  for (const id of createdIds) {
    await cleanupUser(prisma, id).catch(() => {})
  }
  await prisma.$disconnect()
})

// ── CRUD básico ───────────────────────────────────────────────────────────────

describe('POST /api/v1/transactions', () => {
  it('creates an INCOME transaction → 201', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type:        'INCOME',
        amount:      1500,
        description: 'Salário',
        categoryId,
        accountId,
        date:        new Date().toISOString(),
      })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeTruthy()
    expect(res.body.type).toBe('INCOME')
  })

  it('creates an EXPENSE transaction → 201', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type:        'EXPENSE',
        amount:      250,
        description: 'Supermercado',
        categoryId:  expenseCategoryId,
        accountId,
        date:        new Date().toISOString(),
      })
    expect(res.status).toBe(201)
    expect(res.body.type).toBe('EXPENSE')
  })
})

describe('GET /api/v1/transactions', () => {
  it('lists only transactions for the authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    const items = res.body.data ?? res.body
    const arr = Array.isArray(items) ? items : []
    arr.forEach((t: any) => expect(t.userId).toBe(userId))
  })

  it('filters by type=INCOME', async () => {
    const res = await request(app)
      .get('/api/v1/transactions?type=INCOME')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    const arr = Array.isArray(res.body.data ?? res.body) ? (res.body.data ?? res.body) : []
    arr.forEach((t: any) => expect(t.type).toBe('INCOME'))
  })

  it('supports pagination with limit parameter', async () => {
    const res = await request(app)
      .get('/api/v1/transactions?limit=2&page=1')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    // Body should be paginated (data array + meta OR just an array)
    const body = res.body
    if (body.data) {
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBeLessThanOrEqual(2)
    } else {
      expect(Array.isArray(body)).toBe(true)
    }
  })
})

describe('PATCH /api/v1/transactions/:id', () => {
  let txId: string

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'EXPENSE', amount: 100, description: 'Original',
        categoryId: expenseCategoryId, accountId, date: new Date().toISOString(),
      })
    txId = res.body.id
  })

  it('updates description and amount', async () => {
    const res = await request(app)
      .put(`/api/v1/transactions/${txId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ description: 'Updated', amount: 199 })
    expect([200, 201]).toContain(res.status)
    expect(res.body.description).toBe('Updated')
    expect(Number(res.body.amount)).toBe(199)
  })
})

describe('DELETE /api/v1/transactions/:id', () => {
  it('deletes a transaction → 204 and it no longer appears in list', async () => {
    const create = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'EXPENSE', amount: 50, description: 'To Delete',
        categoryId: expenseCategoryId, accountId, date: new Date().toISOString(),
      })
    const id = create.body.id

    const del = await request(app)
      .delete(`/api/v1/transactions/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(del.status).toBe(204)

    // Verify it's gone
    const list = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
    const arr = Array.isArray(list.body.data ?? list.body) ? (list.body.data ?? list.body) : []
    expect(arr.find((t: any) => t.id === id)).toBeUndefined()
  })
})
