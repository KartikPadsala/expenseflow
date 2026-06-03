import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'List notifications with pagination' })
  findAll(
    @CurrentUser() user: { id: string },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.findAll(user.id, Number(page), Number(limit));
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  unreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getUnreadCount(user.id).then((count) => ({ count }));
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Delete('push-token')
  @ApiOperation({ summary: 'Deregister an Expo push token' })
  deregisterPushToken(@CurrentUser() user: { id: string }, @Body('token') token: string) {
    return this.notificationsService.deregisterPushToken(user.id, token);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.delete(id, user.id);
  }

  @Patch('push-token')
  @ApiOperation({ summary: 'Register an Expo push token' })
  registerPushToken(@CurrentUser() user: { id: string }, @Body('token') token: string) {
    return this.notificationsService.registerPushToken(user.id, token);
  }
}
