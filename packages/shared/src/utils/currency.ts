export const CURRENCIES: Record<string, { name: string; symbol: string; flag: string }> = {
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  CAD: { name: 'Canadian Dollar', symbol: 'CA$', flag: '🇨🇦' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  INR: { name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  CNY: { name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  KRW: { name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  MXN: { name: 'Mexican Peso', symbol: 'MX$', flag: '🇲🇽' },
  BRL: { name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  CHF: { name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
  SEK: { name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  NOK: { name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  DKK: { name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  ZAR: { name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  SAR: { name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
  TRY: { name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  RUB: { name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  PLN: { name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
  THB: { name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  PHP: { name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  VND: { name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
  PKR: { name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
};

export function formatCurrency(amount: number, currency: string, locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${CURRENCIES[currency]?.symbol ?? currency}${amount.toFixed(2)}`;
  }
}

export function getCurrencySymbol(currency: string): string {
  return CURRENCIES[currency]?.symbol ?? currency;
}

export function convertCurrency(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Round a monetary value to the appropriate decimal places for a currency.
 * JPY, KRW, etc. have 0 decimal places. Most others have 2.
 */
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'IDR', 'CLP']);

export function roundForCurrency(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100) / 100;
}

/**
 * Format an amount with its original currency and optionally a converted amount.
 * Example: "$12.50 (≈ €11.30)"
 */
export function formatWithConversion(
  amount: number,
  currency: string,
  convertedAmount?: number | null,
  baseCurrency?: string | null,
  locale = 'en-US',
): string {
  const primary = formatCurrency(amount, currency, locale);
  if (convertedAmount != null && baseCurrency && baseCurrency !== currency) {
    const secondary = formatCurrency(convertedAmount, baseCurrency, locale);
    return `${primary} (≈ ${secondary})`;
  }
  return primary;
}

/**
 * Get display label for a currency: "USD ($) — US Dollar"
 */
export function getCurrencyLabel(currency: string): string {
  const info = CURRENCIES[currency];
  if (!info) return currency;
  return `${currency} (${info.symbol}) — ${info.name}`;
}

/**
 * Get short display label: "🇺🇸 USD"
 */
export function getCurrencyShortLabel(currency: string): string {
  const info = CURRENCIES[currency];
  if (!info) return currency;
  return `${info.flag} ${currency}`;
}
