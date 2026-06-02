import { Controller, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ocr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('scan')
  @UseInterceptors(FileInterceptor('receipt'))
  async scan(@UploadedFile() file: Express.Multer.File) {
    return this.ocrService.scan(file.buffer, file.mimetype);
  }
}
