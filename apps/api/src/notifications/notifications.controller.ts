import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: { id: string }, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.notificationsService.findAll(user.id, Number(page), Number(limit));
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.delete(id, user.id);
  }

  @Patch('push-token')
  registerPushToken(@CurrentUser() user: { id: string }, @Body('token') token: string) {
    return this.notificationsService.registerPushToken(user.id, token);
  }
}
