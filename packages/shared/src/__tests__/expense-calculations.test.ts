import { calculateSplit, roundCurrency, validateSplit } from '../utils/expense-calculations';
import type { SplitInput } from '../utils/expense-calculations';

describe('roundCurrency', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundCurrency(10.004)).toBe(10.0);
    expect(roundCurrency(10.125)).toBe(10.13);
  });

  it('handles zero', () => {
    expect(roundCurrency(0)).toBe(0);
  });
});

describe('validateSplit', () => {
  it('returns true when sum equals total', () => {
    const results = [
      { participantId: 'A', owedAmount: 33.34 },
      { participantId: 'B', owedAmount: 33.33 },
      { participantId: 'C', owedAmount: 33.33 },
    ];
    expect(validateSplit(results, 100)).toBe(true);
  });

  it('returns false when sum is off by more than 2 cents', () => {
    const results = [
      { participantId: 'A', owedAmount: 50 },
      { participantId: 'B', owedAmount: 49.97 },
    ];
    expect(validateSplit(results, 100)).toBe(false);
  });
});

describe('calculateSplit - EQUAL', () => {
  it('splits equally among 2 participants', () => {
    const results = calculateSplit({ totalAmount: 100, participantIds: ['A', 'B'], method: 'EQUAL' });
    expect(results).toHaveLength(2);
    expect(results[0].owedAmount).toBe(50);
    expect(results[1].owedAmount).toBe(50);
    expect(validateSplit(results, 100)).toBe(true);
  });

  it('handles rounding for 3-way split', () => {
    const results = calculateSplit({ totalAmount: 10, participantIds: ['A', 'B', 'C'], method: 'EQUAL' });
    const total = results.reduce((s, r) => s + r.owedAmount, 0);
    expect(Math.abs(total - 10)).toBeLessThan(0.02);
    expect(validateSplit(results, 10)).toBe(true);
  });

  it('last participant absorbs rounding remainder', () => {
    const results = calculateSplit({ totalAmount: 10, participantIds: ['A', 'B', 'C'], method: 'EQUAL' });
    const total = results.reduce((s, r) => s + r.owedAmount, 0);
    expect(total).toBeCloseTo(10, 1);
  });

  it('each participant has correct sharePercent', () => {
    const results = calculateSplit({ totalAmount: 90, participantIds: ['A', 'B', 'C'], method: 'EQUAL' });
    results.forEach((r) => {
      expect(r.sharePercent).toBeCloseTo(33.33, 1);
    });
  });
});

describe('calculateSplit - UNEQUAL / EXACT', () => {
  it('assigns custom amounts', () => {
    const results = calculateSplit({
      totalAmount: 90,
      participantIds: ['A', 'B', 'C'],
      method: 'UNEQUAL',
      customAmounts: { A: 40, B: 30, C: 20 },
    });
    expect(results.find((r) => r.participantId === 'A')?.owedAmount).toBe(40);
    expect(results.find((r) => r.participantId === 'B')?.owedAmount).toBe(30);
    expect(results.find((r) => r.participantId === 'C')?.owedAmount).toBe(20);
  });

  it('defaults to 0 for missing participants', () => {
    const results = calculateSplit({
      totalAmount: 50,
      participantIds: ['A', 'B'],
      method: 'UNEQUAL',
      customAmounts: { A: 50 },
    });
    expect(results.find((r) => r.participantId === 'B')?.owedAmount).toBe(0);
  });

  it('EXACT behaves same as UNEQUAL', () => {
    const unequalResult = calculateSplit({
      totalAmount: 60,
      participantIds: ['A', 'B'],
      method: 'UNEQUAL',
      customAmounts: { A: 40, B: 20 },
    });
    const exactResult = calculateSplit({
      totalAmount: 60,
      participantIds: ['A', 'B'],
      method: 'EXACT',
      customAmounts: { A: 40, B: 20 },
    });
    expect(unequalResult).toEqual(exactResult);
  });

  it('calculates sharePercent correctly', () => {
    const results = calculateSplit({
      totalAmount: 100,
      participantIds: ['A', 'B'],
      method: 'UNEQUAL',
      customAmounts: { A: 75, B: 25 },
    });
    expect(results.find((r) => r.participantId === 'A')?.sharePercent).toBeCloseTo(75);
    expect(results.find((r) => r.participantId === 'B')?.sharePercent).toBeCloseTo(25);
  });
});

describe('calculateSplit - PERCENTAGE', () => {
  it('splits by percentage', () => {
    const results = calculateSplit({
      totalAmount: 100,
      participantIds: ['A', 'B'],
      method: 'PERCENTAGE',
      percentages: { A: 60, B: 40 },
    });
    expect(results.find((r) => r.participantId === 'A')?.owedAmount).toBeCloseTo(60);
    expect(results.find((r) => r.participantId === 'B')?.owedAmount).toBeCloseTo(40);
  });

  it('preserves sharePercent from input', () => {
    const results = calculateSplit({
      totalAmount: 200,
      participantIds: ['A', 'B', 'C'],
      method: 'PERCENTAGE',
      percentages: { A: 50, B: 30, C: 20 },
    });
    expect(results.find((r) => r.participantId === 'A')?.sharePercent).toBe(50);
    expect(results.find((r) => r.participantId === 'B')?.sharePercent).toBe(30);
    expect(results.find((r) => r.participantId === 'C')?.sharePercent).toBe(20);
    expect(validateSplit(results, 200)).toBe(true);
  });

  it('defaults to 0 for missing percentage', () => {
    const results = calculateSplit({
      totalAmount: 100,
      participantIds: ['A', 'B'],
      method: 'PERCENTAGE',
      percentages: { A: 100 },
    });
    expect(results.find((r) => r.participantId === 'B')?.owedAmount).toBe(0);
  });
});

describe('calculateSplit - SHARES', () => {
  it('splits by shares (2:1:1 ratio)', () => {
    const results = calculateSplit({
      totalAmount: 100,
      participantIds: ['A', 'B', 'C'],
      method: 'SHARES',
      shares: { A: 2, B: 1, C: 1 },
    });
    expect(results.find((r) => r.participantId === 'A')?.owedAmount).toBeCloseTo(50);
    expect(results.find((r) => r.participantId === 'B')?.owedAmount).toBeCloseTo(25);
    expect(results.find((r) => r.participantId === 'C')?.owedAmount).toBeCloseTo(25);
  });

  it('returns shares on each result', () => {
    const results = calculateSplit({
      totalAmount: 120,
      participantIds: ['A', 'B'],
      method: 'SHARES',
      shares: { A: 3, B: 1 },
    });
    expect(results.find((r) => r.participantId === 'A')?.shares).toBe(3);
    expect(results.find((r) => r.participantId === 'B')?.shares).toBe(1);
  });

  it('defaults to 1 share for missing participant', () => {
    const results = calculateSplit({
      totalAmount: 100,
      participantIds: ['A', 'B'],
      method: 'SHARES',
      shares: { A: 2 },
    });
    // A: 2 shares, B: 1 share (default), total 3 shares
    expect(results.find((r) => r.participantId === 'A')?.owedAmount).toBeCloseTo(66.67);
    expect(results.find((r) => r.participantId === 'B')?.owedAmount).toBeCloseTo(33.33);
  });

  it('handles equal shares (1:1)', () => {
    const results = calculateSplit({
      totalAmount: 60,
      participantIds: ['A', 'B'],
      method: 'SHARES',
      shares: { A: 1, B: 1 },
    });
    expect(validateSplit(results, 60)).toBe(true);
    results.forEach((r) => expect(r.owedAmount).toBe(30));
  });
});

describe('calculateSplit - MULTI_PAYER', () => {
  it('assigns payer contributions', () => {
    const results = calculateSplit({
      totalAmount: 150,
      participantIds: ['A', 'B', 'C'],
      method: 'MULTI_PAYER',
      customAmounts: { A: 80, B: 50, C: 20 },
    });
    expect(results.find((r) => r.participantId === 'A')?.owedAmount).toBe(80);
    expect(results.find((r) => r.participantId === 'B')?.owedAmount).toBe(50);
    expect(results.find((r) => r.participantId === 'C')?.owedAmount).toBe(20);
  });

  it('calculates sharePercent for payers', () => {
    const results = calculateSplit({
      totalAmount: 100,
      participantIds: ['A', 'B'],
      method: 'MULTI_PAYER',
      customAmounts: { A: 60, B: 40 },
    });
    expect(results.find((r) => r.participantId === 'A')?.sharePercent).toBeCloseTo(60);
    expect(results.find((r) => r.participantId === 'B')?.sharePercent).toBeCloseTo(40);
  });
});

describe('calculateSplit - error cases', () => {
  it('throws for unknown split method', () => {
    expect(() => {
      calculateSplit({
        totalAmount: 100,
        participantIds: ['A'],
        method: 'UNKNOWN' as any,
      });
    }).toThrow('Unknown split method: UNKNOWN');
  });
});
