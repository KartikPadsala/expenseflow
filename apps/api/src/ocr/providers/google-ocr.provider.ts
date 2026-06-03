import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { OcrProvider } from './ocr-provider.interface';
import { OcrResult, OcrLineItem } from '@expenseflow/shared';

@Injectable()
export class GoogleOcrProvider implements OcrProvider {
  private readonly logger = new Logger(GoogleOcrProvider.name);
  private client: ImageAnnotatorClient;

  constructor(private configService?: ConfigService) {
    const apiKey = configService?.get<string>('GOOGLE_VISION_API_KEY');
    this.client = apiKey
      ? new ImageAnnotatorClient({ apiKey })
      : new ImageAnnotatorClient(); // falls back to ADC
  }

  async scan(imageBuffer: Buffer, _mimeType: string): Promise<OcrResult> {
    try {
      const [result] = await this.client.documentTextDetection(imageBuffer);
      const rawText = result.fullTextAnnotation?.text ?? '';

      return this.parseReceiptText(rawText);
    } catch (err: any) {
      this.logger.error(`Google Vision OCR failed: ${err?.message}`);
      return { items: [], rawText: `Google Vision OCR error: ${err?.message}` };
    }
  }

  /** Parse raw OCR text into a structured OcrResult */
  private parseReceiptText(rawText: string): OcrResult {
    const result: OcrResult = { items: [], rawText };

    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

    // Merchant — first non-empty line is often the merchant
    if (lines.length > 0) result.merchant = lines[0];

    // Date — look for common date patterns
    const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/;
    for (const line of lines) {
      const m = line.match(dateRegex);
      if (m) {
        const d = new Date(m[1].replace(/[\/\.]/g, '-'));
        if (!isNaN(d.getTime())) { result.date = d.toISOString(); break; }
      }
    }

    // Total — look for "total", "amount due", "grand total" followed by a number
    const totalRegex = /(?:total|amount\s+due|grand\s+total|subtotal)[^\d]*(\d+[\.,]\d{2})/i;
    for (const line of lines) {
      const m = line.match(totalRegex);
      if (m) { result.total = parseFloat(m[1].replace(',', '.')); break; }
    }
    if (!result.total) {
      // Fallback: find last standalone price on a line
      const priceLines = lines.filter((l) => /\d+\.\d{2}$/.test(l));
      if (priceLines.length > 0) {
        const lastPrice = priceLines[priceLines.length - 1].match(/(\d+\.\d{2})$/);
        if (lastPrice) result.total = parseFloat(lastPrice[1]);
      }
    }

    // Tax
    const taxRegex = /(?:tax|gst|hst|vat|tps|tvq)[^\d]*(\d+[\.,]\d{2})/i;
    for (const line of lines) {
      const m = line.match(taxRegex);
      if (m) { result.tax = parseFloat(m[1].replace(',', '.')); break; }
    }

    // Currency — look for common currency symbols or codes
    const currencyMap: Record<string, string> = {
      '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR',
      'USD': 'USD', 'EUR': 'EUR', 'GBP': 'GBP', 'CAD': 'CAD', 'AUD': 'AUD',
    };
    for (const [sym, code] of Object.entries(currencyMap)) {
      if (rawText.includes(sym)) { result.currency = code; break; }
    }

    // Items — lines that have a description + price pattern
    const itemRegex = /^(.+?)\s+(\d+[\.,]\d{2})$/;
    const skipWords = /total|tax|gst|hst|vat|subtotal|discount|change|cash|card/i;
    for (const line of lines) {
      if (skipWords.test(line)) continue;
      const m = line.match(itemRegex);
      if (m) {
        const item: OcrLineItem = { description: m[1].trim(), amount: parseFloat(m[2].replace(',', '.')) };
        if (item.amount > 0 && item.description.length > 1) result.items.push(item);
      }
    }

    return result;
  }
}
