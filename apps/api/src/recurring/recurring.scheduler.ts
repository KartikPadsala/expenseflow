import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecurringService } from './recurring.service';

@Injectable()
export class RecurringScheduler {
  private readonly logger = new Logger(RecurringScheduler.name);

  constructor(private readonly recurringService: RecurringService) {}

  /**
   * Run every day at 00:05 UTC to process due recurring expenses.
   * The 5-minute offset avoids midnight timezone edge cases.
   */
  @Cron('5 0 * * *', { name: 'process-recurring-expenses', timeZone: 'UTC' })
  async handleDailyProcessing() {
    this.logger.log('Running recurring expense processor...');
    const result = await this.recurringService.processDueExpenses();
    this.logger.log(`Recurring processor complete: ${result.processed} processed, ${result.errors} errors`);
  }
}
