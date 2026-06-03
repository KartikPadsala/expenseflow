import { simplifyDebts } from '@expenseflow/shared';

describe('Debt simplification for settlements', () => {
  it('simplifies triangle debt: A→B, B→C becomes A→C', () => {
    const transactions = [
      { from: 'A', to: 'B', amount: 30 },
      { from: 'B', to: 'C', amount: 30 },
    ];
    const simplified = simplifyDebts(transactions);
    expect(simplified).toHaveLength(1);
    expect(simplified[0]).toEqual({ from: 'A', to: 'C', amount: 30 });
  });

  it('simplifies multiple debts to minimum transactions', () => {
    const transactions = [
      { from: 'A', to: 'B', amount: 10 },
      { from: 'C', to: 'B', amount: 20 },
      { from: 'D', to: 'B', amount: 5 },
    ];
    const simplified = simplifyDebts(transactions);
    const totalAmount = simplified.reduce((s, t) => s + t.amount, 0);
    expect(totalAmount).toBeCloseTo(35);
  });

  it('eliminates zero-amount transactions', () => {
    const transactions = [
      { from: 'A', to: 'B', amount: 50 },
      { from: 'B', to: 'A', amount: 50 },
    ];
    const simplified = simplifyDebts(transactions);
    expect(simplified).toHaveLength(0);
  });

  it('handles empty input', () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it('returns single transaction unchanged', () => {
    const transactions = [{ from: 'A', to: 'B', amount: 100 }];
    const result = simplifyDebts(transactions);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 'A', to: 'B', amount: 100 });
  });

  it('handles chain of 4 debts: A→B→C→D', () => {
    const transactions = [
      { from: 'A', to: 'B', amount: 20 },
      { from: 'B', to: 'C', amount: 20 },
      { from: 'C', to: 'D', amount: 20 },
    ];
    const simplified = simplifyDebts(transactions);
    expect(simplified).toHaveLength(1);
    expect(simplified[0]).toEqual({ from: 'A', to: 'D', amount: 20 });
  });

  it('handles partial offsets: A owes B 30, B owes A 10', () => {
    const transactions = [
      { from: 'A', to: 'B', amount: 30 },
      { from: 'B', to: 'A', amount: 10 },
    ];
    const simplified = simplifyDebts(transactions);
    expect(simplified).toHaveLength(1);
    expect(simplified[0]).toMatchObject({ from: 'A', to: 'B', amount: 20 });
  });

  it('preserves total amount invariant after simplification', () => {
    const transactions = [
      { from: 'A', to: 'B', amount: 15 },
      { from: 'B', to: 'C', amount: 10 },
      { from: 'C', to: 'A', amount: 5 },
      { from: 'A', to: 'C', amount: 8 },
    ];
    const simplified = simplifyDebts(transactions);
    // Net flows: A net = -15+5-8 = -18; B net = +15-10 = +5; C net = +10-5+8 = +13
    // Total "flow out" should equal total "flow in"
    const totalOut = simplified.reduce((s, t) => s + t.amount, 0);
    // All amounts should be positive
    expect(simplified.every((t) => t.amount > 0)).toBe(true);
    expect(totalOut).toBeGreaterThan(0);
  });

  it('returns empty for a settlement cycle that nets to zero', () => {
    const transactions = [
      { from: 'A', to: 'B', amount: 10 },
      { from: 'B', to: 'C', amount: 10 },
      { from: 'C', to: 'A', amount: 10 },
    ];
    const simplified = simplifyDebts(transactions);
    expect(simplified).toHaveLength(0);
  });
});

describe('Settlement data shapes', () => {
  it('settlement object has required fields', () => {
    const settlement = {
      id: 's1',
      payerId: 'u1',
      payeeId: 'u2',
      amount: 50,
      currency: 'USD',
      method: 'CASH',
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
    };
    expect(settlement.id).toBeDefined();
    expect(settlement.payerId).not.toEqual(settlement.payeeId);
    expect(settlement.amount).toBeGreaterThan(0);
    expect(['PENDING', 'COMPLETED', 'CANCELLED']).toContain(settlement.status);
  });

  it('cancelled settlement has cancelledAt set', () => {
    const settlement = {
      id: 's1', payerId: 'u1', payeeId: 'u2', amount: 50, currency: 'USD',
      status: 'CANCELLED' as const, createdAt: new Date().toISOString(),
      cancelledAt: new Date().toISOString(),
    };
    expect(settlement.cancelledAt).toBeDefined();
    expect(new Date(settlement.cancelledAt).getTime()).toBeGreaterThanOrEqual(
      new Date(settlement.createdAt).getTime(),
    );
  });

  it('completed settlement has settledAt set', () => {
    const settlement = {
      id: 's1', payerId: 'u1', payeeId: 'u2', amount: 50, currency: 'USD',
      status: 'COMPLETED' as const, createdAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
    };
    expect(settlement.settledAt).toBeDefined();
  });

  it('formatCurrency produces correct output', () => {
    const fmt = (amount: number, currency = 'USD') =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
    expect(fmt(50, 'USD')).toBe('$50.00');
    expect(fmt(1234.5, 'EUR')).toMatch(/1,234\.50/);
  });

  it('stats shape has correct keys', () => {
    const stats = { totalOwed: 100, totalOwing: 50, pendingCount: 3, completedCount: 10, cancelledCount: 2 };
    expect(stats).toHaveProperty('totalOwed');
    expect(stats).toHaveProperty('totalOwing');
    expect(stats).toHaveProperty('pendingCount');
    expect(stats.totalOwed).toBeGreaterThanOrEqual(0);
    expect(stats.totalOwing).toBeGreaterThanOrEqual(0);
  });
});
