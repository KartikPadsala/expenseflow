import { Injectable, Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ExchangeRatesService } from '../exchange-rates.service';

@Processor('exchange-rates')
@Injectable()
export class FetchRatesJob {
  private readonly logger = new Logger(FetchRatesJob.name);

  constructor(private exchangeRatesService: ExchangeRatesService) {}

  @Process('fetch')
  async handleFetch(_job: Job) {
    this.logger.log('Fetching exchange rates...');
    await this.exchangeRatesService.fetchAndStoreRates();
  }
}
