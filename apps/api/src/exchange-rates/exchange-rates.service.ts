import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Get the exchange rate from `from` to `to` on a specific date.
   * Falls back to most recent available rate if exact date not found.
   */
  async getRate(from: string, to: string, date?: string): Promise<number> {
    if (from === to) return 1;

    const normalized = from.toUpperCase();
    const normalizedTo = to.toUpperCase();

    // Direct rate lookup
    const directRate = await this.lookupRate(normalized, normalizedTo, date);
    if (directRate !== null) return directRate;

    // Try cross rate via USD
    return this.getCrossRate(normalized, normalizedTo, date);
  }

  /**
   * Compute cross rate between two non-USD currencies via USD as intermediary.
   * EUR → GBP = (USD→GBP) / (USD→EUR)
   */
  async getCrossRate(from: string, to: string, date?: string): Promise<number> {
    if (from === to) return 1;

    // If one of them is USD, use direct lookup
    if (from === 'USD') {
      const rate = await this.lookupRate('USD', to, date);
      return rate ?? 1;
    }
    if (to === 'USD') {
      const rate = await this.lookupRate('USD', from, date);
      return rate !== null ? 1 / rate : 1;
    }

    // Both non-USD: compute via USD
    const [usdToFrom, usdToTo] = await Promise.all([
      this.lookupRate('USD', from, date),
      this.lookupRate('USD', to, date),
    ]);

    if (usdToFrom === null || usdToTo === null) {
      // Ensure rates are loaded then retry
      await this.fetchAndStoreRates();
      const [r1, r2] = await Promise.all([
        this.lookupRate('USD', from),
        this.lookupRate('USD', to),
      ]);
      if (r1 === null || r2 === null) {
        this.logger.warn(`Cannot compute cross rate ${from}→${to}, using 1`);
        return 1;
      }
      return Math.round((r2 / r1) * 1_000_000) / 1_000_000;
    }

    return Math.round((usdToTo / usdToFrom) * 1_000_000) / 1_000_000;
  }

  /**
   * Convert an amount from one currency to another.
   * Returns both the converted amount and the rate used.
   */
  async convertAmount(
    amount: number,
    from: string,
    to: string,
    date?: string,
  ): Promise<{ convertedAmount: number; rate: number }> {
    if (from === to) return { convertedAmount: amount, rate: 1 };
    const rate = await this.getRate(from, to, date);
    const convertedAmount = Math.round(amount * rate * 100) / 100;
    return { convertedAmount, rate };
  }

  /**
   * Get all available rates for a given base currency (for frontend use).
   * Returns a map of toCurrency → rate.
   */
  async getLatestRates(base = 'USD'): Promise<Record<string, number>> {
    await this.fetchAndStoreRates();

    const rates = await this.prisma.exchangeRate.findMany({
      where: { fromCurrency: 'USD' },
      orderBy: { date: 'desc' },
      distinct: ['toCurrency'],
    });

    const usdRates: Record<string, number> = {};
    for (const r of rates) {
      usdRates[r.toCurrency] = Number(r.rate);
    }

    if (base === 'USD') return usdRates;

    // Rebase to requested base currency
    const baseRate = usdRates[base];
    if (!baseRate) return usdRates;

    const rebased: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(usdRates)) {
      rebased[currency] = Math.round((rate / baseRate) * 1_000_000) / 1_000_000;
    }
    rebased[base] = 1;
    return rebased;
  }

  /**
   * Fetch today's exchange rates from open.er-api.com and persist to DB.
   * Uses USD as base. Free tier only supports latest rates.
   */
  async fetchAndStoreRates(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Skip if already fetched today
    const existing = await this.prisma.exchangeRate.findFirst({
      where: { fromCurrency: 'USD', date: today },
    });
    if (existing) return;

    try {
      const apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');
      const url = apiKey
        ? `https://open.er-api.com/v6/latest/USD?apikey=${apiKey}`
        : 'https://open.er-api.com/v6/latest/USD';
      const { data } = await axios.get(url, { timeout: 10_000 });

      if (data.result !== 'success' && !data.rates) {
        this.logger.warn('Exchange rate API returned unexpected format');
        return;
      }

      const upserts = Object.entries(data.rates as Record<string, number>).map(
        ([toCurrency, rate]) =>
          this.prisma.exchangeRate.upsert({
            where: {
              fromCurrency_toCurrency_date: {
                fromCurrency: 'USD',
                toCurrency,
                date: today,
              },
            },
            update: { rate },
            create: { fromCurrency: 'USD', toCurrency, rate, date: today },
          }),
      );

      await Promise.all(upserts);
      this.logger.log(`Stored ${upserts.length} exchange rates for ${today.toISOString().slice(0, 10)}`);
    } catch (err: any) {
      this.logger.error(`Failed to fetch exchange rates: ${err?.message}`);
    }
  }

  // ── Private helpers ────────────────────────────────────────────

  private async lookupRate(from: string, to: string, date?: string): Promise<number | null> {
    if (from === to) return 1;

    if (date) {
      const rateDate = new Date(date);
      rateDate.setHours(0, 0, 0, 0);

      const exact = await this.prisma.exchangeRate.findUnique({
        where: { fromCurrency_toCurrency_date: { fromCurrency: from, toCurrency: to, date: rateDate } },
      });
      if (exact) return Number(exact.rate);
    }

    // Fall back to most recent rate
    const latest = await this.prisma.exchangeRate.findFirst({
      where: { fromCurrency: from, toCurrency: to },
      orderBy: { date: 'desc' },
    });
    return latest ? Number(latest.rate) : null;
  }
}
