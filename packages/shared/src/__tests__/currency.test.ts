import {
  formatCurrency,
  getCurrencySymbol,
  convertCurrency,
  roundForCurrency,
  formatWithConversion,
  getCurrencyLabel,
  getCurrencyShortLabel,
} from '../utils/currency';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(12.5, 'USD')).toBe('$12.50');
  });

  it('formats EUR correctly', () => {
    expect(formatCurrency(100, 'EUR')).toContain('100');
    expect(formatCurrency(100, 'EUR')).toContain('€');
  });

  it('formats JPY without decimals', () => {
    const result = formatCurrency(1500, 'JPY');
    expect(result).not.toContain('.');
  });

  it('falls back gracefully for unknown currency', () => {
    const result = formatCurrency(10, 'XYZ');
    expect(result).toContain('10');
    expect(result).toContain('XYZ');
  });
});

describe('convertCurrency', () => {
  it('multiplies by rate and rounds to 2dp', () => {
    expect(convertCurrency(100, 0.92)).toBe(92);
  });

  it('rounds correctly at 3dp boundary', () => {
    expect(convertCurrency(100, 0.8573)).toBe(85.73);
  });

  it('handles rate of 1', () => {
    expect(convertCurrency(50, 1)).toBe(50);
  });

  it('handles zero amount', () => {
    expect(convertCurrency(0, 1.5)).toBe(0);
  });
});

describe('roundForCurrency', () => {
  it('rounds USD to 2 decimal places', () => {
    expect(roundForCurrency(10.999, 'USD')).toBe(11.0);
    expect(roundForCurrency(10.555, 'USD')).toBe(10.56);
  });

  it('rounds JPY to 0 decimal places', () => {
    expect(roundForCurrency(1500.7, 'JPY')).toBe(1501);
    expect(roundForCurrency(1500.2, 'JPY')).toBe(1500);
  });

  it('rounds KRW to 0 decimal places', () => {
    expect(roundForCurrency(5000.9, 'KRW')).toBe(5001);
  });
});

describe('formatWithConversion', () => {
  it('shows only primary when currencies match', () => {
    const result = formatWithConversion(12.5, 'USD', 11.5, 'USD');
    expect(result).not.toContain('≈');
  });

  it('shows converted amount when currencies differ', () => {
    const result = formatWithConversion(12.5, 'USD', 11.5, 'EUR');
    expect(result).toContain('≈');
    expect(result).toContain('$12.50');
    expect(result).toContain('11.50');
  });

  it('shows only primary when convertedAmount is null', () => {
    const result = formatWithConversion(12.5, 'USD', null, 'EUR');
    expect(result).not.toContain('≈');
  });
});

describe('getCurrencyLabel', () => {
  it('returns formatted label for known currency', () => {
    const label = getCurrencyLabel('USD');
    expect(label).toContain('USD');
    expect(label).toContain('$');
    expect(label).toContain('US Dollar');
  });

  it('returns currency code for unknown currency', () => {
    expect(getCurrencyLabel('XYZ')).toBe('XYZ');
  });
});

describe('getCurrencyShortLabel', () => {
  it('includes flag and code', () => {
    const label = getCurrencyShortLabel('USD');
    expect(label).toContain('USD');
    expect(label).toContain('🇺🇸');
  });
});

describe('mixed-currency conversion scenarios', () => {
  it('EUR expense converted to USD: 100 EUR at rate 1.087 = 108.70 USD', () => {
    const rate = 1.087;
    const result = convertCurrency(100, rate);
    expect(result).toBe(108.7);
  });

  it('JPY expense converted to USD: 1000 JPY at rate 0.0067 = 6.70 USD', () => {
    const rate = 0.0067;
    const result = convertCurrency(1000, rate);
    expect(result).toBe(6.7);
  });

  it('cross-rate: GBP to EUR via USD rates', () => {
    const usdToGbp = 0.79;
    const usdToEur = 0.92;
    // GBP→EUR = usdToEur / usdToGbp
    const gbpToEur = usdToEur / usdToGbp;
    const converted = convertCurrency(100, gbpToEur);
    expect(converted).toBeCloseTo(116.46, 0);
  });
});
