import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: { id: string }) { return this.categoriesService.findAll(user.id); }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() body: { name: string; icon: string; color: string }) {
    return this.categoriesService.create(user.id, body);
  }

  @Patch(':id')
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: Partial<{ name: string; icon: string; color: string }>) {
    return this.categoriesService.update(id, user.id, body);
  }

  @Delete(':id')
  delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.categoriesService.delete(id, user.id);
  }
}
