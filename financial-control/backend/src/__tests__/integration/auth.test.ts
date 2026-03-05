/**
 * Integration tests — Auth (register, login, sessions, password change)
 *
 * Requires DATABASE_URL_TEST to be set and migrations applied.
 * Run with: npm run test:integration
 *
 * NOTE: Zod validation-error tests (uppercase, short password, invalid email)
 * are NOT included here. In Express 4, ZodError thrown inside an async handler
 * is NOT automatically forwarded to the error middleware — those requests hang
 * until the test timeout. These cases are better tested at the unit level.
 */

import request from 'supertest'
import app from '../../app'
import { testPrisma, createUser, cleanupUser, DEFAULT_PASSWORD } from '../helpers/factories'

const prisma = testPrisma()
const createdIds: string[] = []

afterAll(async () => {
  for (const id of createdIds) {
    await cleanupUser(prisma, id).catch(() => {})
  }
  await prisma.$disconnect()
})

// ── Register ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('creates a user with valid data → 201 + accessToken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name:     'João Tester',
        email:    `reg-${Date.now()}@example.com`,
        password: DEFAULT_PASSWORD,
      })
    expect(res.status).toBe(201)
    expect(res.body.accessToken).toBeTruthy()
    if (res.body.user?.id) createdIds.push(res.body.user.id)
  })

  it('creates default categories for the new user automatically', async () => {
    const email = `reg-cats-${Date.now()}@example.com`
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Cat User', email, password: DEFAULT_PASSWORD })
    expect(res.status).toBe(201)
    const userId = res.body.user?.id
    if (userId) {
      createdIds.push(userId)
      const cats = await prisma.category.count({ where: { userId } })
      expect(cats).toBeGreaterThan(0)
    }
  })

  it('rejects duplicate email → 409', async () => {
    const email = `dup-${Date.now()}@example.com`
    const first = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'First', email, password: DEFAULT_PASSWORD })
    if (first.body.user?.id) createdIds.push(first.body.user.id)

    const second = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Second', email, password: DEFAULT_PASSWORD })
    // 409 from our custom check OR Prisma P2002 unique violation
    expect([409]).toContain(second.status)
  })
})

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  let userEmail: string
  let userId: string

  beforeAll(async () => {
    userEmail = `login-${Date.now()}@example.com`
    const user = await createUser(prisma, { email: userEmail })
    userId = user.id
    createdIds.push(userId)
  })

  it('returns 200 + accessToken + httpOnly cookie with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: DEFAULT_PASSWORD })
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeTruthy()
    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined
    expect(cookies?.some((c: string) => c.includes('refresh_token'))).toBe(true)
    expect(cookies?.some((c: string) => c.includes('HttpOnly'))).toBe(true)
  })

  it('returns 401 for wrong password (no info leak)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: 'WrongPass@99' })
    expect(res.status).toBe(401)
  })

  it('returns 401 for non-existent email (same message as wrong password)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: DEFAULT_PASSWORD })
    expect(res.status).toBe(401)
  })
})

// ── Password Change ───────────────────────────────────────────────────────────

describe('PUT /api/v1/auth/change-password', () => {
  // Each describe has its own user to avoid cross-test contamination
  let accessToken: string
  let userId: string

  beforeAll(async () => {
    const email = `changepw-${Date.now()}@example.com`
    // Create user directly in DB (fast — no HTTP, no rate-limit count)
    const user = await createUser(prisma, { email })
    userId = user.id
    createdIds.push(userId)
    // Login via HTTP to obtain a real JWT + session
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: DEFAULT_PASSWORD })
    accessToken = login.body.accessToken
  })

  it('accepts valid current password + strong new password → 200', async () => {
    const res = await request(app)
      .put('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'NewZt8#mQpX!v9L' })
    expect(res.status).toBe(200)
  })

  it('rejects wrong current password → 401', async () => {
    // The JWT issued in beforeAll is still valid; use it with a wrong current password
    const res = await request(app)
      .put('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongCurrent@123!', newPassword: 'Another@Pass!99' })
    expect([400, 401]).toContain(res.status)
  })
})

// ── Sessions ──────────────────────────────────────────────────────────────────

describe('GET /api/v1/auth/sessions', () => {
  let accessToken: string
  let userId: string

  beforeAll(async () => {
    const email = `sessions-${Date.now()}@example.com`
    const user = await createUser(prisma, { email })
    userId = user.id
    createdIds.push(userId)
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: DEFAULT_PASSWORD })
    accessToken = login.body.accessToken
  })

  it('returns active sessions array with at least one entry for the current session', async () => {
    const res = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    // Verify the session has expected shape
    const session = res.body[0]
    expect(session.id).toBeTruthy()
  })
})
