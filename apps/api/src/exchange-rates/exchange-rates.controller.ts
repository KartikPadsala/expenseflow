import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExchangeRatesService } from './exchange-rates.service';

@ApiTags('exchange-rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Get()
  @ApiQuery({ name: 'base', required: false, description: '3-letter currency code, default USD' })
  async getRates(@Query('base') base = 'USD') {
    const rates = await this.service.getLatestRates(base);
    return { base, rates };
  }

  @Get('convert')
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'amount', required: true })
  @ApiQuery({ name: 'date', required: false })
  async convert(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('amount') amount: string,
    @Query('date') date?: string,
  ) {
    return this.service.convertAmount(parseFloat(amount), from, to, date);
  }
}
