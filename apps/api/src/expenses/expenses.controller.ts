import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, ListExpensesDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }, @Query() query: ListExpensesDto) {
    return this.expensesService.findAll(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.expensesService.findOne(id, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(id, user.id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.expensesService.delete(id, user.id);
  }

  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.expensesService.duplicate(id, user.id);
  }
}
