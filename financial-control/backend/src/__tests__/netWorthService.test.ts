import { calcAccountBalance, calcTotalAssets, calcNetWorth } from '../services/netWorthService'

// ─── calcAccountBalance ───────────────────────────────────────────────────────

describe('calcAccountBalance', () => {
  it('returns initialBalance when no transactions exist', () => {
    expect(calcAccountBalance(1000, [])).toBe(1000)
  })

  it('adds INCOME transactions', () => {
    const txs = [
      { type: 'INCOME', amount: 500 },
      { type: 'INCOME', amount: 300 },
    ]
    expect(calcAccountBalance(0, txs)).toBe(800)
  })

  it('subtracts EXPENSE transactions', () => {
    const txs = [
      { type: 'EXPENSE', amount: 200 },
      { type: 'EXPENSE', amount: 50 },
    ]
    expect(calcAccountBalance(1000, txs)).toBe(750)
  })

  it('handles mixed INCOME and EXPENSE', () => {
    const txs = [
      { type: 'INCOME', amount: 1000 },
      { type: 'EXPENSE', amount: 400 },
      { type: 'INCOME', amount: 200 },
    ]
    // 500 + 1000 - 400 + 200 = 1300
    expect(calcAccountBalance(500, txs)).toBe(1300)
  })

  it('can produce a negative balance (overdraft scenario)', () => {
    const txs = [{ type: 'EXPENSE', amount: 2000 }]
    expect(calcAccountBalance(500, txs)).toBe(-1500)
  })

  it('handles decimal amounts without precision loss', () => {
    const txs = [{ type: 'INCOME', amount: 99.99 }]
    expect(calcAccountBalance(0.01, txs)).toBeCloseTo(100, 5)
  })
})

// ─── calcTotalAssets ──────────────────────────────────────────────────────────

describe('calcTotalAssets', () => {
  it('returns 0 with no accounts', () => {
    expect(calcTotalAssets([])).toBe(0)
  })

  it('sums balances across multiple accounts', () => {
    const accounts = [
      { initialBalance: 1000, transactions: [] },
      { initialBalance: 500, transactions: [{ type: 'INCOME', amount: 200 }] },
      { initialBalance: 0, transactions: [{ type: 'EXPENSE', amount: 100 }] },
    ]
    // 1000 + 700 + (-100) = 1600
    expect(calcTotalAssets(accounts)).toBe(1600)
  })

  it('transfers between accounts do NOT change totalAssets', () => {
    /**
     * Scenario: transfer R$500 from account A to account B.
     * Backend creates:
     *   - EXPENSE $500 on account A (transferId: 'abc')
     *   - INCOME  $500 on account B (transferId: 'abc')
     *
     * Both legs are regular transactions from the balance calculation's
     * perspective. The net effect on totalAssets must be zero.
     */
    const accounts = [
      {
        initialBalance: 2000,
        transactions: [{ type: 'EXPENSE', amount: 500 }], // transfer out
      },
      {
        initialBalance: 0,
        transactions: [{ type: 'INCOME', amount: 500 }],  // transfer in
      },
    ]
    // Before transfer: 2000 + 0 = 2000
    // After  transfer: 1500 + 500 = 2000
    expect(calcTotalAssets(accounts)).toBe(2000)
  })

  it('multiple transfers still leave totalAssets unchanged', () => {
    const accounts = [
      {
        initialBalance: 5000,
        transactions: [
          { type: 'EXPENSE', amount: 1000 }, // transfer to savings
          { type: 'EXPENSE', amount: 500 },  // transfer to investment
        ],
      },
      {
        initialBalance: 0,
        transactions: [{ type: 'INCOME', amount: 1000 }], // received from checking
      },
      {
        initialBalance: 0,
        transactions: [{ type: 'INCOME', amount: 500 }], // received from checking
      },
    ]
    // 3500 + 1000 + 500 = 5000 (unchanged)
    expect(calcTotalAssets(accounts)).toBe(5000)
  })
})

// ─── calcNetWorth ─────────────────────────────────────────────────────────────

describe('calcNetWorth', () => {
  it('returns assets when no liabilities', () => {
    expect(calcNetWorth(10000, 0)).toBe(10000)
  })

  it('subtracts liabilities from assets', () => {
    expect(calcNetWorth(50000, 20000)).toBe(30000)
  })

  it('returns negative when liabilities exceed assets', () => {
    expect(calcNetWorth(5000, 80000)).toBe(-75000)
  })

  it('returns zero when assets equal liabilities', () => {
    expect(calcNetWorth(15000, 15000)).toBe(0)
  })
})

// ─── Integration-style scenario ───────────────────────────────────────────────

describe('full net worth calculation scenario', () => {
  it('calculates correctly with accounts + liabilities + transfers', () => {
    /**
     * Accounts:
     *   Checking: R$3,000 initial, -R$500 (transfer to investment), -R$200 (expense)
     *   Investment: R$0 initial, +R$500 (transfer in), +R$100 (yield/income)
     *
     * Liabilities:
     *   Loan: R$10,000
     *   Financing: R$5,000
     */
    const accounts = [
      {
        initialBalance: 3000,
        transactions: [
          { type: 'EXPENSE', amount: 500 }, // transfer out
          { type: 'EXPENSE', amount: 200 }, // regular expense
        ],
      },
      {
        initialBalance: 0,
        transactions: [
          { type: 'INCOME', amount: 500 }, // transfer in
          { type: 'INCOME', amount: 100 }, // yield
        ],
      },
    ]

    const totalAssets = calcTotalAssets(accounts)
    // Checking: 3000 - 500 - 200 = 2300
    // Investment: 0 + 500 + 100 = 600
    // Total: 2900
    expect(totalAssets).toBe(2900)

    const totalLiabilities = 10000 + 5000 // 15000
    const netWorth = calcNetWorth(totalAssets, totalLiabilities)
    // 2900 - 15000 = -12100
    expect(netWorth).toBe(-12100)
  })
})
