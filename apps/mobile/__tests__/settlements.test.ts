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
});
