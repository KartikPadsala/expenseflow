import { Injectable } from '@nestjs/common';
import { OcrProvider } from './ocr-provider.interface';
import { OcrResult } from '@expenseflow/shared';

@Injectable()
export class GoogleOcrProvider implements OcrProvider {
  async scan(_imageBuffer: Buffer, _mimeType: string): Promise<OcrResult> {
    return { items: [], rawText: 'Google Vision OCR not configured' };
  }
}
