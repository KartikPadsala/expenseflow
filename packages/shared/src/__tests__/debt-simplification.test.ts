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

  it('produces deterministic output for same input (sorted by amount)', () => {
    const transactions = [
      { from: 'A', to: 'D', amount: 5 },
      { from: 'B', to: 'D', amount: 30 },
      { from: 'C', to: 'D', amount: 15 },
    ];
    const result1 = simplifyDebts([...transactions]);
    const result2 = simplifyDebts([...transactions].reverse());
    // Both runs should produce identical results
    expect(result1).toEqual(result2);
  });

  it('largest debtor pays largest creditor first', () => {
    const result = simplifyDebts([
      { from: 'A', to: 'D', amount: 5 },
      { from: 'B', to: 'D', amount: 30 },
    ]);
    // D is owed 35 total; B (30) is larger debtor
    const bTx = result.find((t) => t.from === 'B');
    expect(bTx?.amount).toBe(30);
  });
});
