import { Controller, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload/:expenseId')
  @UseInterceptors(FileInterceptor('file'))
  upload(@CurrentUser() user: { id: string }, @Param('expenseId') expenseId: string, @UploadedFile() file: Express.Multer.File) {
    return this.attachmentsService.upload(user.id, expenseId, file);
  }

  @Delete(':id')
  delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.attachmentsService.delete(id, user.id);
  }
}
