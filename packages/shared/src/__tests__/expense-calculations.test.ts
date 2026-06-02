import { calculateSplit, validateSplit } from '../utils/expense-calculations';

describe('calculateSplit', () => {
  it('splits equally among participants', () => {
    const results = calculateSplit({
      totalAmount: 30,
      participantIds: ['A', 'B', 'C'],
      method: 'EQUAL',
    });
    const total = results.reduce((s, r) => s + r.owedAmount, 0);
    expect(total).toBeCloseTo(30);
    expect(validateSplit(results, 30)).toBe(true);
  });

  it('splits by percentage', () => {
    const results = calculateSplit({
      totalAmount: 100,
      participantIds: ['A', 'B'],
      method: 'PERCENTAGE',
      percentages: { A: 60, B: 40 },
    });
    expect(results.find(r => r.participantId === 'A')?.owedAmount).toBeCloseTo(60);
    expect(results.find(r => r.participantId === 'B')?.owedAmount).toBeCloseTo(40);
  });

  it('splits by shares', () => {
    const results = calculateSplit({
      totalAmount: 100,
      participantIds: ['A', 'B', 'C'],
      method: 'SHARES',
      shares: { A: 2, B: 1, C: 1 },
    });
    expect(results.find(r => r.participantId === 'A')?.owedAmount).toBeCloseTo(50);
  });

  it('handles unequal split', () => {
    const results = calculateSplit({
      totalAmount: 90,
      participantIds: ['A', 'B', 'C'],
      method: 'UNEQUAL',
      customAmounts: { A: 40, B: 30, C: 20 },
    });
    expect(results.find(r => r.participantId === 'A')?.owedAmount).toBe(40);
  });
});
