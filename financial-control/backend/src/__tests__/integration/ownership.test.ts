/**
 * Integration tests — Ownership / IDOR prevention
 *
 * Tests that userA cannot access or modify resources belonging to userB.
 * Uses 404 (not 403) responses to prevent resource enumeration.
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

let tokenA: string, userAId: string
let tokenB: string, userBId: string
let txBId: string
let accountBId: string

beforeAll(async () => {
  // Create two independent users
  const emailA = `idor-a-${Date.now()}@example.com`
  const emailB = `idor-b-${Date.now()}@example.com`

  const [userA, userB] = await Promise.all([
    createUser(prisma, { email: emailA }),
    createUser(prisma, { email: emailB }),
  ])
  userAId = userA.id
  userBId = userB.id

  const [loginA, loginB] = await Promise.all([
    loginUser(app, emailA),
    loginUser(app, emailB),
  ])
  tokenA = loginA.accessToken
  tokenB = loginB.accessToken

  // Create resources for userB
  const [catB, accB] = await Promise.all([
    createCategory(prisma, userBId, 'EXPENSE'),
    createAccount(prisma, userBId),
  ])
  accountBId = accB.id

  const txB = await createTransaction(prisma, userBId, catB.id, {
    accountId: accB.id,
  })
  txBId = txB.id
})

afterAll(async () => {
  await cleanupUser(prisma, userAId).catch(() => {})
  await cleanupUser(prisma, userBId).catch(() => {})
  await prisma.$disconnect()
})

// ── Transaction IDOR ──────────────────────────────────────────────────────────

describe('Transaction ownership', () => {
  it("userA's GET /transactions returns only userA's own transactions", async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(200)
    const arr = Array.isArray(res.body.data ?? res.body) ? (res.body.data ?? res.body) : []
    expect(arr.every((t: any) => t.userId === userAId)).toBe(true)
    // userB's transaction must NOT appear
    expect(arr.find((t: any) => t.id === txBId)).toBeUndefined()
  })

  it('userA DELETE on userB transaction returns 404 (anti-enumeration)', async () => {
    const res = await request(app)
      .delete(`/api/v1/transactions/${txBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(404)
  })

  it('userA PATCH on userB transaction returns 404', async () => {
    const res = await request(app)
      .patch(`/api/v1/transactions/${txBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ description: 'Hacked' })
    expect(res.status).toBe(404)
  })
})

// ── Account IDOR ──────────────────────────────────────────────────────────────

describe('Account ownership', () => {
  it('userA PATCH on userB account returns 404', async () => {
    const res = await request(app)
      .patch(`/api/v1/accounts/${accountBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Hacked Account' })
    expect(res.status).toBe(404)
  })

  it('userA DELETE on userB account returns 404', async () => {
    const res = await request(app)
      .delete(`/api/v1/accounts/${accountBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(404)
  })
})

// ── Self-access control ───────────────────────────────────────────────────────

describe('Self-access is allowed', () => {
  it('userA can delete their own transaction', async () => {
    const catA = await createCategory(prisma, userAId, 'EXPENSE')
    const accA = await createAccount(prisma, userAId)
    const txA = await createTransaction(prisma, userAId, catA.id, { accountId: accA.id })

    const res = await request(app)
      .delete(`/api/v1/transactions/${txA.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(204)
  })
})
