import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';
import { RecurringScheduler } from './recurring.scheduler';
import { CreateRecurringJob } from './jobs/create-recurring.job';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: 'recurring-expenses' }),
    ExpensesModule,
  ],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringScheduler, CreateRecurringJob],
  exports: [RecurringService],
})
export class RecurringModule {}
