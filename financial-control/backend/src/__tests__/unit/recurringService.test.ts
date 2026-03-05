/**
 * Unit tests — recurringService.generateRecurringForMonth()
 *
 * Prisma is fully mocked — no database required.
 * Each test builds a minimal mock that records created transactions.
 */

import { generateRecurringForMonth } from '../../services/recurringService'

// ── Mock builder ──────────────────────────────────────────────────────────────

interface MockTx {
  id: string
  userId: string
  categoryId: string
  accountId: string | null
  type: string
  amount: number
  description: string
  notes: string | null
  date: Date
  isRecurring: boolean
  recurrenceType: string | null
  recurrenceEnd: Date | null
  isPaused: boolean
  parentId: string | null
}

let createdTxs: MockTx[] = []

function buildTemplate(overrides: Partial<MockTx> = {}): MockTx {
  return {
    id:            'tpl-1',
    userId:        'user-1',
    categoryId:    'cat-1',
    accountId:     null,
    type:          'EXPENSE',
    amount:        100,
    description:   'Recurring',
    notes:         null,
    date:          new Date(2025, 0, 15), // Jan 15 2025 — well before test month
    isRecurring:   true,
    recurrenceType:'MONTHLY',
    recurrenceEnd: null,
    isPaused:      false,
    parentId:      null,
    ...overrides,
  }
}

function makePrismaMock(templates: MockTx[], existingInstances: MockTx[] = []) {
  return {
    transaction: {
      findMany: jest.fn().mockResolvedValue(templates),
      findFirst: jest.fn().mockResolvedValue(null), // no duplicates by default
      create: jest.fn().mockImplementation(({ data }: { data: MockTx }) => {
        const tx = { ...data, id: `inst-${Date.now()}` }
        createdTxs.push(tx as MockTx)
        return Promise.resolve(tx)
      }),
    },
  } as any
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  createdTxs = []
})

// ── MONTHLY ───────────────────────────────────────────────────────────────────

describe('MONTHLY recurrence', () => {
  it('creates one instance on the correct day', async () => {
    const template = buildTemplate({ date: new Date(2025, 0, 15), recurrenceType: 'MONTHLY' })
    const prisma = makePrismaMock([template])
    await generateRecurringForMonth('user-1', 3, 2025, prisma) // March 2025
    expect(createdTxs).toHaveLength(1)
    expect(createdTxs[0].date.getDate()).toBe(15)
    expect(createdTxs[0].date.getMonth()).toBe(2) // March (0-indexed)
  })

  it('clamps day 31 to last day of shorter months (e.g. Feb = 28)', async () => {
    const template = buildTemplate({ date: new Date(2025, 0, 31), recurrenceType: 'MONTHLY' })
    const prisma = makePrismaMock([template])
    await generateRecurringForMonth('user-1', 2, 2025, prisma) // February 2025
    expect(createdTxs).toHaveLength(1)
    expect(createdTxs[0].date.getDate()).toBe(28)
  })

  it('does not create duplicate when instance already exists', async () => {
    const template = buildTemplate({ recurrenceType: 'MONTHLY' })
    const prisma = makePrismaMock([template])
    // Override findFirst to return an existing instance
    prisma.transaction.findFirst.mockResolvedValue({ id: 'existing' })
    await generateRecurringForMonth('user-1', 3, 2025, prisma)
    expect(createdTxs).toHaveLength(0)
  })

  it('does NOT generate when template is paused', async () => {
    const template = buildTemplate({ recurrenceType: 'MONTHLY', isPaused: true })
    // isPaused templates are excluded in the findMany WHERE clause
    const prisma = makePrismaMock([]) // findMany returns empty (filtered out by DB)
    await generateRecurringForMonth('user-1', 3, 2025, prisma)
    expect(createdTxs).toHaveLength(0)
  })

  it('does NOT generate after recurrenceEnd has passed', async () => {
    // recurrenceEnd = Feb 2025, requesting March 2025 → template is excluded by DB filter
    const template = buildTemplate({
      recurrenceType: 'MONTHLY',
      recurrenceEnd: new Date(2025, 1, 28),
    })
    const prisma = makePrismaMock([]) // filtered out by DB WHERE clause
    await generateRecurringForMonth('user-1', 3, 2025, prisma)
    expect(createdTxs).toHaveLength(0)
  })
})

// ── YEARLY ────────────────────────────────────────────────────────────────────

describe('YEARLY recurrence', () => {
  it('generates only in the matching month', async () => {
    // Template date = March 10
    const template = buildTemplate({ date: new Date(2024, 2, 10), recurrenceType: 'YEARLY' })
    const prisma = makePrismaMock([template])
    await generateRecurringForMonth('user-1', 3, 2025, prisma) // March 2025 ✓
    expect(createdTxs).toHaveLength(1)
    expect(createdTxs[0].date.getDate()).toBe(10)
  })

  it('does NOT generate in other months', async () => {
    const template = buildTemplate({ date: new Date(2024, 2, 10), recurrenceType: 'YEARLY' })
    const prisma = makePrismaMock([template])
    await generateRecurringForMonth('user-1', 4, 2025, prisma) // April — wrong month
    expect(createdTxs).toHaveLength(0)
  })
})

// ── LAST_DAY ──────────────────────────────────────────────────────────────────

describe('LAST_DAY recurrence', () => {
  it('generates on the last day of the month (28 for Feb non-leap)', async () => {
    const template = buildTemplate({ recurrenceType: 'LAST_DAY' })
    const prisma = makePrismaMock([template])
    await generateRecurringForMonth('user-1', 2, 2025, prisma) // Feb 2025
    expect(createdTxs).toHaveLength(1)
    expect(createdTxs[0].date.getDate()).toBe(28)
  })

  it('generates on day 31 for months with 31 days', async () => {
    const template = buildTemplate({ recurrenceType: 'LAST_DAY' })
    const prisma = makePrismaMock([template])
    await generateRecurringForMonth('user-1', 3, 2025, prisma) // March 2025
    expect(createdTxs).toHaveLength(1)
    expect(createdTxs[0].date.getDate()).toBe(31)
  })

  it('generates on day 29 for Feb 2024 (leap year)', async () => {
    const template = buildTemplate({ recurrenceType: 'LAST_DAY' })
    const prisma = makePrismaMock([template])
    await generateRecurringForMonth('user-1', 2, 2024, prisma)
    expect(createdTxs).toHaveLength(1)
    expect(createdTxs[0].date.getDate()).toBe(29)
  })
})

// ── BUSINESS_DAYS ─────────────────────────────────────────────────────────────

describe('BUSINESS_DAYS recurrence', () => {
  it('generates on the first weekday (Mon-Fri) of the month', async () => {
    // June 2025: June 1 is a Sunday → first business day is June 2 (Monday)
    const template = buildTemplate({ recurrenceType: 'BUSINESS_DAYS' })
    const prisma = makePrismaMock([template])
    await generateRecurringForMonth('user-1', 6, 2025, prisma)
    expect(createdTxs).toHaveLength(1)
    const day = createdTxs[0].date.getDay()
    expect([1, 2, 3, 4, 5]).toContain(day) // Mon-Fri
    // Verify it's NOT a weekend
    expect([0, 6]).not.toContain(day)
  })

  it('generates on day 1 when month starts on a weekday', async () => {
    // April 2025: April 1 is a Tuesday
    const template = buildTemplate({ recurrenceType: 'BUSINESS_DAYS' })
    const prisma = makePrismaMock([template])
    await generateRecurringForMonth('user-1', 4, 2025, prisma)
    expect(createdTxs).toHaveLength(1)
    expect(createdTxs[0].date.getDate()).toBe(1)
  })
})

// ── WEEKLY ────────────────────────────────────────────────────────────────────

describe('WEEKLY recurrence', () => {
  it('generates one instance per matching weekday in the month', async () => {
    // Template date is a Monday (2025-01-06)
    const template = buildTemplate({ date: new Date(2025, 0, 6), recurrenceType: 'WEEKLY' })
    const prisma = makePrismaMock([template])
    await generateRecurringForMonth('user-1', 3, 2025, prisma) // March 2025

    // March 2025 Mondays: 3, 10, 17, 24, 31 → 5 instances
    expect(createdTxs.length).toBeGreaterThanOrEqual(4)
    for (const tx of createdTxs) {
      expect(tx.date.getDay()).toBe(1) // Monday
    }
  })

  it('does not create duplicate weekly instances', async () => {
    const template = buildTemplate({ date: new Date(2025, 0, 6), recurrenceType: 'WEEKLY' })
    const prisma = makePrismaMock([template])
    // Mark all days as already existing
    prisma.transaction.findFirst.mockResolvedValue({ id: 'existing' })
    await generateRecurringForMonth('user-1', 3, 2025, prisma)
    expect(createdTxs).toHaveLength(0)
  })
})
