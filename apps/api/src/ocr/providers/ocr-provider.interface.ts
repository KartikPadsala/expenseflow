import { OcrResult } from '@expenseflow/shared';

export interface OcrProvider {
  scan(imageBuffer: Buffer, mimeType: string): Promise<OcrResult>;
}
