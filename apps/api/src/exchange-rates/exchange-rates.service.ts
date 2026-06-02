import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(private prisma: PrismaService, private configService: ConfigService) {}

  async getRate(from: string, to: string, date?: string): Promise<number> {
    if (from === to) return 1;
    const rateDate = date ? new Date(date) : new Date();
    rateDate.setHours(0, 0, 0, 0);

    const stored = await this.prisma.exchangeRate.findUnique({
      where: { fromCurrency_toCurrency_date: { fromCurrency: from, toCurrency: to, date: rateDate } },
    });
    if (stored) return Number(stored.rate);

    await this.fetchAndStoreRates();
    const fresh = await this.prisma.exchangeRate.findFirst({
      where: { fromCurrency: from, toCurrency: to },
      orderBy: { date: 'desc' },
    });
    return fresh ? Number(fresh.rate) : 1;
  }

  async fetchAndStoreRates() {
    try {
      const apiKey = this.configService.get('EXCHANGE_RATE_API_KEY');
      const url = apiKey
        ? `https://open.er-api.com/v6/latest/USD?apikey=${apiKey}`
        : 'https://open.er-api.com/v6/latest/USD';
      const { data } = await axios.get(url);
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const upserts = Object.entries(data.rates as Record<string, number>).map(([toCurrency, rate]) =>
        this.prisma.exchangeRate.upsert({
          where: { fromCurrency_toCurrency_date: { fromCurrency: 'USD', toCurrency, date: today } },
          update: { rate },
          create: { fromCurrency: 'USD', toCurrency, rate, date: today },
        })
      );
      await Promise.all(upserts);
      this.logger.log(`Fetched ${Object.keys(data.rates).length} exchange rates`);
    } catch (err) {
      this.logger.error('Failed to fetch exchange rates', err);
    }
  }
}
