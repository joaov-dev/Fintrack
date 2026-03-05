/**
 * Unit tests — monthlyProjectionService pure helpers
 *
 * Covers: daysInMonth()
 * No database required.
 */

import { daysInMonth } from '../../services/monthlyProjectionService'

describe('daysInMonth', () => {
  it('returns 31 for January', () => {
    expect(daysInMonth(2025, 1)).toBe(31)
  })

  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth(2025, 2)).toBe(28)
  })

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
  })

  it('returns 30 for April', () => {
    expect(daysInMonth(2025, 4)).toBe(30)
  })

  it('returns 31 for December', () => {
    expect(daysInMonth(2025, 12)).toBe(31)
  })

  it('returns 30 for June', () => {
    expect(daysInMonth(2025, 6)).toBe(30)
  })

  it('handles year 2000 (leap year) correctly', () => {
    expect(daysInMonth(2000, 2)).toBe(29)
  })

  it('handles year 1900 (non-leap year despite divisible by 100) correctly', () => {
    expect(daysInMonth(1900, 2)).toBe(28)
  })
})
