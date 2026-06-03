import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across expenses, groups, and users' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', required: true })
  @ApiQuery({ name: 'limit', description: 'Max results per category (default 10)', required: false })
  globalSearch(
    @CurrentUser() user: { id: string },
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.globalSearch(user.id, query, limit ? Number(limit) : 10);
  }
}
