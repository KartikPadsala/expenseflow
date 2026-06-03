import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, AddMemberDto, UpdateMemberRoleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.id, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search groups by name' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  searchGroups(@CurrentUser() user: { id: string }, @Query('q') q: string) {
    return this.groupsService.search(user.id, q);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.groupsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.groupsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, user.id, dto);
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.groupsService.archive(id, user.id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.groupsService.delete(id, user.id);
  }

  @Post(':id/members')
  addMember(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.groupsService.addMember(id, user.id, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(@CurrentUser() user: { id: string }, @Param('id') id: string, @Param('memberId') memberId: string) {
    return this.groupsService.removeMember(id, user.id, memberId);
  }

  @Patch(':id/members/:memberId/role')
  updateMemberRole(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.groupsService.updateMemberRole(id, user.id, memberId, dto);
  }

  @Get(':id/balances')
  getBalances(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.groupsService.getBalances(id, user.id);
  }
}
