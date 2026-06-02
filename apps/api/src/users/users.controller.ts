import {
  Controller, Get, Patch, Delete, Body, Query, UseGuards,
  Post, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Deactivate account' })
  deleteMe(@CurrentUser() user: { id: string }) {
    return this.usersService.deleteMe(user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  search(@CurrentUser() user: { id: string }, @Query('q') query: string) {
    return this.usersService.search(query, user.id);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Upload avatar' })
  uploadAvatar(@CurrentUser() user: { id: string }, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadAvatar(user.id, file);
  }
}
