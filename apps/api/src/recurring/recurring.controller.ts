import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecurringService } from './recurring.service';
import { CreateRecurringExpenseDto, UpdateRecurringExpenseDto } from './dto';

@ApiTags('recurring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @ApiOperation({ summary: 'Create a recurring expense' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateRecurringExpenseDto) {
    return this.recurringService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all recurring expenses for current user' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.recurringService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recurring expense with its history' })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.recurringService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring expense' })
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdateRecurringExpenseDto) {
    return this.recurringService.update(id, user.id, dto);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause a recurring expense' })
  pause(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.recurringService.pause(id, user.id);
  }

  @Patch(':id/resume')
  @ApiOperation({ summary: 'Resume a paused recurring expense' })
  resume(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.recurringService.resume(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recurring expense' })
  delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.recurringService.delete(id, user.id);
  }
}
