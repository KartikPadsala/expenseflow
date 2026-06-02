import { Controller, Post, Delete, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  sendRequest(@CurrentUser() user: { id: string }, @Body('addresseeId') addresseeId: string) {
    return this.friendsService.sendRequest(user.id, addresseeId);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.friendsService.accept(id, user.id);
  }

  @Post(':id/decline')
  decline(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.friendsService.decline(id, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.friendsService.remove(id, user.id);
  }

  @Post(':id/block')
  block(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.friendsService.block(id, user.id);
  }

  @Get()
  getFriends(@CurrentUser() user: { id: string }) {
    return this.friendsService.getFriends(user.id);
  }

  @Get('requests')
  getRequests(@CurrentUser() user: { id: string }) {
    return this.friendsService.getPendingRequests(user.id);
  }

  @Post('invite/email')
  inviteByEmail(@CurrentUser() user: { id: string }, @Body('email') email: string) {
    return this.friendsService.inviteByEmail(user.id, email);
  }
}
