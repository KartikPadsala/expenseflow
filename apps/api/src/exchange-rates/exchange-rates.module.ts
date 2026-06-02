import { Module } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { BullModule } from '@nestjs/bull';
import { FetchRatesJob } from './jobs/fetch-rates.job';

@Module({
  imports: [BullModule.registerQueue({ name: 'exchange-rates' })],
  providers: [ExchangeRatesService, FetchRatesJob],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
