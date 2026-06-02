import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { OcrProvider } from './ocr-provider.interface';
import { OcrResult } from '@expenseflow/shared';

@Injectable()
export class OpenAiOcrProvider implements OcrProvider {
  private readonly logger = new Logger(OpenAiOcrProvider.name);
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({ apiKey: this.configService.get('OPENAI_API_KEY') });
  }

  async scan(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    const base64 = imageBuffer.toString('base64');
    const response = await this.client.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract receipt data from this image. Return a JSON object with: merchant (string), date (ISO string), total (number), tax (number), currency (string, e.g. USD), items (array of {description, amount, quantity}). Return only valid JSON.',
            },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    try {
      const match = content.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : { items: [] };
    } catch {
      this.logger.error('Failed to parse OCR response', content);
      return { items: [] };
    }
  }
}
