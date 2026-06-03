import {
  Controller, Post, UseGuards, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('ocr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('scan')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { receipt: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('receipt', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  async scan(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Use field name "receipt".');
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_MIMES.join(', ')}`,
      );
    }
    return this.ocrService.scan(file.buffer, file.mimetype);
  }
}
