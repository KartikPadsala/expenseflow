import { computeNextDate, isDue, isExpired } from '../recurring-date.utils';

describe('computeNextDate', () => {
  describe('DAILY', () => {
    it('adds 1 day', () => {
      const base = new Date(2024, 2, 15); // March 15, 2024 local
      const next = computeNextDate(base, 'DAILY');
      expect(next.getDate()).toBe(16);
      expect(next.getMonth()).toBe(2);
    });

    it('crosses month boundary', () => {
      const base = new Date(2024, 0, 31); // Jan 31 local
      const next = computeNextDate(base, 'DAILY');
      expect(next.getDate()).toBe(1);
      expect(next.getMonth()).toBe(1); // February
    });
  });

  describe('WEEKLY', () => {
    it('adds 7 days', () => {
      const base = new Date(2024, 2, 15); // March 15 local
      const next = computeNextDate(base, 'WEEKLY');
      expect(next.getDate()).toBe(22);
      expect(next.getMonth()).toBe(2);
    });

    it('crosses month boundary', () => {
      const base = new Date(2024, 2, 29); // March 29 local
      const next = computeNextDate(base, 'WEEKLY');
      expect(next.getDate()).toBe(5);
      expect(next.getMonth()).toBe(3); // April
    });
  });

  describe('MONTHLY', () => {
    it('advances by one month', () => {
      const base = new Date(2024, 0, 15); // Jan 15 local
      const next = computeNextDate(base, 'MONTHLY');
      expect(next.getDate()).toBe(15);
      expect(next.getMonth()).toBe(1); // February
    });

    it('clamps day 31 to end of February (leap year)', () => {
      const base = new Date(2024, 0, 31); // Jan 31 local, 2024 is leap
      const next = computeNextDate(base, 'MONTHLY');
      expect(next.getMonth()).toBe(1);
      expect(next.getDate()).toBe(29);
    });

    it('clamps day 31 to end of April', () => {
      const base = new Date(2024, 2, 31); // March 31 local
      const next = computeNextDate(base, 'MONTHLY');
      expect(next.getMonth()).toBe(3); // April
      expect(next.getDate()).toBe(30);
    });
  });

  describe('QUARTERLY', () => {
    it('advances by 3 months', () => {
      const base = new Date(2024, 0, 15); // Jan 15 local
      const next = computeNextDate(base, 'QUARTERLY');
      expect(next.getMonth()).toBe(3); // April
      expect(next.getDate()).toBe(15);
    });

    it('crosses year boundary', () => {
      const base = new Date(2024, 10, 15); // Nov 15 local
      const next = computeNextDate(base, 'QUARTERLY');
      expect(next.getFullYear()).toBe(2025);
      expect(next.getMonth()).toBe(1); // February
    });
  });

  describe('YEARLY', () => {
    it('advances by 1 year', () => {
      const base = new Date(2024, 2, 15); // March 15 local
      const next = computeNextDate(base, 'YEARLY');
      expect(next.getFullYear()).toBe(2025);
      expect(next.getMonth()).toBe(2); // March
      expect(next.getDate()).toBe(15);
    });

    it('handles Feb 29 on leap year → Feb 28 on non-leap year', () => {
      const base = new Date(2024, 1, 29); // Feb 29, 2024 (leap year) local
      const next = computeNextDate(base, 'YEARLY');
      expect(next.getFullYear()).toBe(2025);
      expect(next.getMonth()).toBe(1); // February
      expect(next.getDate()).toBe(28); // 2025 is not a leap year
    });

    it('preserves Feb 29 on next leap year', () => {
      const base = new Date(2024, 1, 29); // Feb 29, 2024 local
      const next = computeNextDate(base, 'YEARLY');
      expect(next.getFullYear()).toBe(2025);
      expect(next.getDate()).toBe(28);
    });
  });

  it('does not mutate the input date', () => {
    const base = new Date(2024, 0, 15);
    const original = base.getTime();
    computeNextDate(base, 'MONTHLY');
    expect(base.getTime()).toBe(original);
  });
});

describe('isDue', () => {
  it('returns true when nextDueDate is in the past', () => {
    const past = new Date(Date.now() - 86400000);
    expect(isDue(past)).toBe(true);
  });

  it('returns false when nextDueDate is in the future', () => {
    const future = new Date(Date.now() + 86400000);
    expect(isDue(future)).toBe(false);
  });

  it('returns false when past endDate', () => {
    const past = new Date(Date.now() - 86400000);
    const endDate = new Date(Date.now() - 3600000);
    expect(isDue(past, endDate)).toBe(false);
  });
});

describe('isExpired', () => {
  it('returns false when no endDate', () => {
    expect(isExpired(null)).toBe(false);
    expect(isExpired(undefined)).toBe(false);
  });

  it('returns true when endDate is in the past', () => {
    const past = new Date(Date.now() - 86400000);
    expect(isExpired(past)).toBe(true);
  });

  it('returns false when endDate is in the future', () => {
    const future = new Date(Date.now() + 86400000);
    expect(isExpired(future)).toBe(false);
  });
});
