import { getBillingCycle, resolveClosingDay, getInstallmentDate } from '../billingCycleUtils'

describe('resolveClosingDay', () => {
  it('returns closingDay when month has enough days', () => {
    expect(resolveClosingDay(2026, 2, 15)).toBe(15) // March
  })

  it('clamps to last day of February (non-leap)', () => {
    expect(resolveClosingDay(2025, 1, 31)).toBe(28)
  })

  it('clamps to last day of February (leap year)', () => {
    expect(resolveClosingDay(2024, 1, 31)).toBe(29)
  })

  it('returns 30 for April when closingDay=31', () => {
    expect(resolveClosingDay(2026, 3, 31)).toBe(30)
  })

  it('returns 31 for March when closingDay=31', () => {
    expect(resolveClosingDay(2026, 2, 31)).toBe(31)
  })
})

describe('getBillingCycle — basic placement', () => {
  // closingDay=10, dueDay=20
  // Feb 5 (before closing) → closes Feb 10, due Feb 20
  it('purchase before closing → closes this month', () => {
    const cycle = getBillingCycle(10, 20, new Date(2026, 1, 5)) // Feb 5
    expect(cycle.closingDate.getMonth()).toBe(1) // February
    expect(cycle.closingDate.getDate()).toBe(10)
    expect(cycle.dueDate.getMonth()).toBe(1) // February (dueDay=20 > closingDay=10)
    expect(cycle.dueDate.getDate()).toBe(20)
    expect(cycle.periodStart.getDate()).toBe(11) // Jan 11
    expect(cycle.periodStart.getMonth()).toBe(0) // January
    expect(cycle.periodEnd.getDate()).toBe(10)
    expect(cycle.periodEnd.getMonth()).toBe(1)
  })

  // Feb 20 (after closing) → closes Mar 10, due Mar 20
  it('purchase after closing → closes next month', () => {
    const cycle = getBillingCycle(10, 20, new Date(2026, 1, 20)) // Feb 20
    expect(cycle.closingDate.getMonth()).toBe(2) // March
    expect(cycle.closingDate.getDate()).toBe(10)
    expect(cycle.dueDate.getMonth()).toBe(2) // March
    expect(cycle.dueDate.getDate()).toBe(20)
    expect(cycle.periodStart.getDate()).toBe(11) // Feb 11
    expect(cycle.periodStart.getMonth()).toBe(1)
  })

  // Purchase exactly ON closing day → same month
  it('purchase on closing day → closes this month', () => {
    const cycle = getBillingCycle(10, 20, new Date(2026, 1, 10)) // Feb 10
    expect(cycle.closingDate.getMonth()).toBe(1)
    expect(cycle.closingDate.getDate()).toBe(10)
  })
})

describe('getBillingCycle — dueDay <= closingDay (due month after closing)', () => {
  // closingDay=20, dueDay=5 → due in month AFTER closing
  it('closingDay=20, dueDay=5, purchase Jan 15 → closes Jan 20, due Feb 5', () => {
    const cycle = getBillingCycle(20, 5, new Date(2026, 0, 15)) // Jan 15
    expect(cycle.closingDate.getMonth()).toBe(0) // January
    expect(cycle.closingDate.getDate()).toBe(20)
    expect(cycle.dueDate.getMonth()).toBe(1) // February
    expect(cycle.dueDate.getDate()).toBe(5)
  })
})

describe('getBillingCycle — February edge cases', () => {
  // closingDay=31, purchase in Feb → closing resolves to Feb 28
  it('closingDay=31 in February → closing on Feb 28 (non-leap)', () => {
    const cycle = getBillingCycle(31, 10, new Date(2025, 1, 15)) // Feb 15, 2025
    expect(cycle.closingDate.getMonth()).toBe(1) // February
    expect(cycle.closingDate.getDate()).toBe(28)
  })

  it('closingDay=31 in February leap year → closing on Feb 29', () => {
    const cycle = getBillingCycle(31, 10, new Date(2024, 1, 15)) // Feb 15, 2024
    expect(cycle.closingDate.getMonth()).toBe(1)
    expect(cycle.closingDate.getDate()).toBe(29)
  })
})

describe('getBillingCycle — year boundary', () => {
  // closingDay=10, purchase Dec 20 → closes Jan 10 of next year
  it('purchase in December after closing → closes in January next year', () => {
    const cycle = getBillingCycle(10, 20, new Date(2025, 11, 20)) // Dec 20, 2025
    expect(cycle.closingDate.getFullYear()).toBe(2026)
    expect(cycle.closingDate.getMonth()).toBe(0) // January
    expect(cycle.closingDate.getDate()).toBe(10)
    expect(cycle.dueDate.getFullYear()).toBe(2026)
    expect(cycle.dueDate.getMonth()).toBe(0)
    expect(cycle.dueDate.getDate()).toBe(20)
  })
})

describe('getInstallmentDate', () => {
  it('installment 1 = start date', () => {
    const start = new Date(2026, 1, 20) // Feb 20
    const d = getInstallmentDate(start, 1)
    expect(d.getMonth()).toBe(1)
    expect(d.getDate()).toBe(20)
  })

  it('installment 2 = one month later', () => {
    const start = new Date(2026, 1, 20)
    const d = getInstallmentDate(start, 2)
    expect(d.getMonth()).toBe(2) // March
    expect(d.getDate()).toBe(20)
  })

  it('installment 3 = two months later', () => {
    const start = new Date(2026, 1, 20)
    const d = getInstallmentDate(start, 3)
    expect(d.getMonth()).toBe(3) // April
    expect(d.getDate()).toBe(20)
  })

  it('clamps to last day of month for Jan 31 → February', () => {
    const start = new Date(2026, 0, 31) // Jan 31
    const d = getInstallmentDate(start, 2) // Feb
    expect(d.getMonth()).toBe(1)
    expect(d.getDate()).toBe(28) // 2026 is not a leap year
  })

  it('handles year overflow for 3 installments starting in Nov', () => {
    const start = new Date(2025, 10, 15) // Nov 15
    const d3 = getInstallmentDate(start, 3) // Jan 15, 2026
    expect(d3.getFullYear()).toBe(2026)
    expect(d3.getMonth()).toBe(0)
    expect(d3.getDate()).toBe(15)
  })
})
