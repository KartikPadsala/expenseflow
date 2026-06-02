import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ExpensesModule } from '../expenses/expenses.module';
import { CreateRecurringJob } from './jobs/create-recurring.job';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'recurring-expenses' }),
    ExpensesModule,
  ],
  providers: [CreateRecurringJob],
})
export class RecurringModule {}
