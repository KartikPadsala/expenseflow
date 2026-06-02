import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  findAll(@CurrentUser() user: { id: string }) {
    return this.settlementsService.findAll(user.id);
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
