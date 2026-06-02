import { Injectable, Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ExpensesService } from '../../expenses/expenses.service';

@Processor('recurring-expenses')
@Injectable()
export class CreateRecurringJob {
  private readonly logger = new Logger(CreateRecurringJob.name);

  constructor(private expensesService: ExpensesService) {}

  @Process('create')
  async handleCreate(job: Job<{ userId: string; expenseData: any }>) {
    this.logger.log(`Creating recurring expense for user ${job.data.userId}`);
    await this.expensesService.create(job.data.userId, job.data.expenseData);
  }
}
