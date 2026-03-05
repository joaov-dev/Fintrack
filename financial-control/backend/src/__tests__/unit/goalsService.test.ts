/**
 * Unit tests — goalsService pure helpers
 *
 * Covers: addMonthsToDate(), computeGoalStatus()
 * No database required.
 */

import { addMonthsToDate, computeGoalStatus } from '../../services/goalsService'

describe('addMonthsToDate', () => {
  it('adds 0 months correctly', () => {
    const base = new Date(2025, 0, 1) // Jan 2025
    expect(addMonthsToDate(base, 0)).toBe('2025-01')
  })

  it('adds positive months within same year', () => {
    const base = new Date(2025, 0, 1) // Jan 2025
    expect(addMonthsToDate(base, 3)).toBe('2025-04')
  })

  it('rolls over to next year correctly', () => {
    const base = new Date(2025, 10, 1) // Nov 2025
    expect(addMonthsToDate(base, 3)).toBe('2026-02')
  })

  it('pads single-digit months with leading zero', () => {
    const base = new Date(2025, 0, 1)
    expect(addMonthsToDate(base, 1)).toBe('2025-02')
  })

  it('handles fractional months by ceiling', () => {
    const base = new Date(2025, 0, 1)
    // Math.ceil(1.5) === 2, so adds 2 months
    expect(addMonthsToDate(base, 1.5)).toBe('2025-03')
  })

  it('handles large month additions', () => {
    const base = new Date(2025, 0, 1)
    expect(addMonthsToDate(base, 24)).toBe('2027-01')
  })
})

describe('computeGoalStatus', () => {
  const now = new Date()
  // A future target date (2 years from now)
  const futureTarget = `${now.getFullYear() + 2}-06`
  // A past target date
  const pastTarget = '2020-01'
  // An estimated completion that is before the future target
  const earlyEst = `${now.getFullYear() + 1}-01`
  // An estimated completion that is after the future target
  const lateEst = `${now.getFullYear() + 5}-01`

  it('returns COMPLETED when progress >= 1', () => {
    expect(computeGoalStatus(1.0, earlyEst, futureTarget, 500)).toBe('COMPLETED')
    expect(computeGoalStatus(1.5, earlyEst, futureTarget, 500)).toBe('COMPLETED')
  })

  it('returns VERY_BEHIND when monthlyContribution <= 0', () => {
    expect(computeGoalStatus(0.5, earlyEst, futureTarget, 0)).toBe('VERY_BEHIND')
    expect(computeGoalStatus(0.5, earlyEst, futureTarget, -100)).toBe('VERY_BEHIND')
  })

  it('returns VERY_BEHIND when estimatedCompletion is null and contribution > 0', () => {
    expect(computeGoalStatus(0.5, null, futureTarget, 500)).toBe('VERY_BEHIND')
  })

  it('returns ON_TRACK when no targetDate is set (open-ended goal)', () => {
    expect(computeGoalStatus(0.5, earlyEst, null, 500)).toBe('ON_TRACK')
  })

  it('returns ON_TRACK when estimatedCompletion <= targetDate', () => {
    expect(computeGoalStatus(0.5, earlyEst, futureTarget, 500)).toBe('ON_TRACK')
  })

  it('returns BEHIND when estimatedCompletion > targetDate', () => {
    expect(computeGoalStatus(0.5, lateEst, futureTarget, 500)).toBe('BEHIND')
  })

  it('returns BEHIND when goal missed a past target', () => {
    expect(computeGoalStatus(0.8, lateEst, pastTarget, 500)).toBe('BEHIND')
  })

  it('progress capped: 0.99 is still ON_TRACK (not COMPLETED)', () => {
    expect(computeGoalStatus(0.99, earlyEst, futureTarget, 500)).toBe('ON_TRACK')
  })
})
