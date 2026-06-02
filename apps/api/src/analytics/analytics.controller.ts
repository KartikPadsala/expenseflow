import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('spending')
  getSpending(@CurrentUser() u: { id: string }, @Query('period') period: 'month' | 'year' = 'month', @Query('groupId') groupId?: string) {
    return this.analyticsService.getSpending(u.id, period, groupId);
  }

  @Get('categories')
  getCategories(@CurrentUser() u: { id: string }, @Query('period') period: 'month' | 'year' = 'month') {
    return this.analyticsService.getCategoryBreakdown(u.id, period);
  }

  @Get('trends')
  getTrends(@CurrentUser() u: { id: string }, @Query('months') months = 6) {
    return this.analyticsService.getTrends(u.id, Number(months));
  }

  @Get('top-expenses')
  getTopExpenses(@CurrentUser() u: { id: string }, @Query('limit') limit = 10) {
    return this.analyticsService.getTopExpenses(u.id, Number(limit));
  }
}
