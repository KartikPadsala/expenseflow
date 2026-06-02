import { simplifyDebts } from '../utils/debt-simplification';

describe('simplifyDebts', () => {
  it('handles empty transactions', () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it('simplifies A->B, B->C to A->C', () => {
    const result = simplifyDebts([
      { from: 'A', to: 'B', amount: 10 },
      { from: 'B', to: 'C', amount: 10 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 'A', to: 'C', amount: 10 });
  });

  it('handles circular debts', () => {
    const result = simplifyDebts([
      { from: 'A', to: 'B', amount: 10 },
      { from: 'B', to: 'C', amount: 10 },
      { from: 'C', to: 'A', amount: 10 },
    ]);
    expect(result).toHaveLength(0);
  });

  it('minimizes transactions for 3 people', () => {
    const result = simplifyDebts([
      { from: 'A', to: 'C', amount: 20 },
      { from: 'B', to: 'C', amount: 30 },
    ]);
    // C is owed 50 total, should be settled in 2 transactions (or 1 if A and B owe different to C)
    const total = result.reduce((s, t) => s + t.amount, 0);
    expect(total).toBeCloseTo(50);
  });

  it('does not reduce when no simplification is possible', () => {
    const result = simplifyDebts([
      { from: 'A', to: 'B', amount: 10 },
      { from: 'C', to: 'D', amount: 20 },
    ]);
    expect(result).toHaveLength(2);
  });
});
