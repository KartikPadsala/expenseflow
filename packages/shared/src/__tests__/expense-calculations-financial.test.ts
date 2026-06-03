function calculateSplitLocal(
  totalAmount: number,
  participantIds: string[],
  method: string,
  options?: {
    customAmounts?: Record<string, number>;
    percentages?: Record<string, number>;
    shares?: Record<string, number>;
  }
): Array<{ participantId: string; owedAmount: number }> {
  if (participantIds.length === 0 || totalAmount < 0) return [];

  if (method === 'EQUAL') {
    const share = Math.round((totalAmount / participantIds.length) * 100) / 100;
    const remainder = Math.round((totalAmount - share * participantIds.length) * 100) / 100;
    return participantIds.map((id, i) => ({
      participantId: id,
      owedAmount: i === 0 ? share + remainder : share,
    }));
  }

  if (method === 'UNEQUAL' && options?.customAmounts) {
    return participantIds.map((id) => ({
      participantId: id,
      owedAmount: options.customAmounts![id] ?? 0,
    }));
  }

  if (method === 'PERCENTAGE' && options?.percentages) {
    return participantIds.map((id) => ({
      participantId: id,
      owedAmount: Math.round((totalAmount * (options.percentages![id] ?? 0) / 100) * 100) / 100,
    }));
  }

  if (method === 'SHARES' && options?.shares) {
    const totalShares = participantIds.reduce((s, id) => s + (options.shares![id] ?? 1), 0);
    return participantIds.map((id) => ({
      participantId: id,
      owedAmount: Math.round((totalAmount * (options.shares![id] ?? 1) / totalShares) * 100) / 100,
    }));
  }

  return [];
}

describe('calculateSplit - Financial Workflow Integration', () => {
  const participants = ['alice', 'bob', 'charlie'];

  describe('EQUAL split', () => {
    it('splits evenly among 3 people', () => {
      const result = calculateSplitLocal(90, participants, 'EQUAL');
      result.forEach((r) => expect(r.owedAmount).toBeCloseTo(30));
    });

    it('handles amounts that do not divide evenly (penny correction)', () => {
      const result = calculateSplitLocal(10, ['a', 'b', 'c'], 'EQUAL');
      const total = result.reduce((s, r) => s + r.owedAmount, 0);
      expect(total).toBeCloseTo(10);
    });

    it('single participant gets full amount', () => {
      const result = calculateSplitLocal(50, ['alice'], 'EQUAL');
      expect(result[0].owedAmount).toBe(50);
    });

    it('handles zero amount', () => {
      const result = calculateSplitLocal(0, ['a', 'b'], 'EQUAL');
      result.forEach((r) => expect(r.owedAmount).toBe(0));
    });
  });

  describe('PERCENTAGE split', () => {
    it('splits by percentages correctly', () => {
      const result = calculateSplitLocal(100, ['a', 'b', 'c'], 'PERCENTAGE', {
        percentages: { a: 50, b: 30, c: 20 },
      });
      expect(result.find((r) => r.participantId === 'a')!.owedAmount).toBeCloseTo(50);
      expect(result.find((r) => r.participantId === 'b')!.owedAmount).toBeCloseTo(30);
      expect(result.find((r) => r.participantId === 'c')!.owedAmount).toBeCloseTo(20);
    });

    it('total equals original amount', () => {
      const result = calculateSplitLocal(75, ['a', 'b'], 'PERCENTAGE', {
        percentages: { a: 60, b: 40 },
      });
      const total = result.reduce((s, r) => s + r.owedAmount, 0);
      expect(total).toBeCloseTo(75);
    });
  });

  describe('SHARES split', () => {
    it('splits 1:2:1 shares correctly', () => {
      const result = calculateSplitLocal(80, ['a', 'b', 'c'], 'SHARES', {
        shares: { a: 1, b: 2, c: 1 },
      });
      expect(result.find((r) => r.participantId === 'a')!.owedAmount).toBeCloseTo(20);
      expect(result.find((r) => r.participantId === 'b')!.owedAmount).toBeCloseTo(40);
      expect(result.find((r) => r.participantId === 'c')!.owedAmount).toBeCloseTo(20);
    });
  });

  describe('UNEQUAL split', () => {
    it('uses custom amounts directly', () => {
      const result = calculateSplitLocal(100, ['a', 'b', 'c'], 'UNEQUAL', {
        customAmounts: { a: 40, b: 35, c: 25 },
      });
      expect(result.find((r) => r.participantId === 'a')!.owedAmount).toBe(40);
      expect(result.find((r) => r.participantId === 'b')!.owedAmount).toBe(35);
      expect(result.find((r) => r.participantId === 'c')!.owedAmount).toBe(25);
    });
  });
});
