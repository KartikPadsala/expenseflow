import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OcrProvider } from './providers/ocr-provider.interface';
import { OpenAiOcrProvider } from './providers/openai-ocr.provider';
import { GoogleOcrProvider } from './providers/google-ocr.provider';
import { AzureOcrProvider } from './providers/azure-ocr.provider';

@Injectable()
export class OcrService {
  private provider: OcrProvider;

  constructor(private configService: ConfigService) {
    const providerName = this.configService.get('OCR_PROVIDER') || 'openai';
    switch (providerName) {
      case 'google': this.provider = new GoogleOcrProvider(); break;
      case 'azure': this.provider = new AzureOcrProvider(); break;
      default: this.provider = new OpenAiOcrProvider(configService);
    }
  }

  async scan(imageBuffer: Buffer, mimeType: string) {
    return this.provider.scan(imageBuffer, mimeType);
  }
}
