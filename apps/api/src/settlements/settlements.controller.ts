import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('settlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateSettlementDto) {
    return this.settlementsService.create(user.id, dto);
  }

  @Get()
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'COMPLETED', 'CANCELLED'] })
  findAll(
    @CurrentUser() user: { id: string },
    @Query('groupId') groupId?: string,
    @Query('status') status?: string,
  ) {
    return this.settlementsService.findAll(user.id, groupId, status);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.settlementsService.findOne(id, user.id);
  }

  @Patch(':id/complete')
  complete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.settlementsService.complete(id, user.id);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.settlementsService.cancel(id, user.id);
  }
}
