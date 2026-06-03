import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OcrProvider } from './ocr-provider.interface';
import { OcrResult, OcrLineItem } from '@expenseflow/shared';

/**
 * Azure AI Document Intelligence (Form Recognizer) — prebuilt-receipt model.
 * Docs: https://learn.microsoft.com/azure/ai-services/document-intelligence/prebuilt/receipt
 */
@Injectable()
export class AzureOcrProvider implements OcrProvider {
  private readonly logger = new Logger(AzureOcrProvider.name);
  private endpoint: string;
  private key: string;

  constructor(private configService?: ConfigService) {
    this.endpoint = (configService?.get<string>('AZURE_FORM_RECOGNIZER_ENDPOINT') ?? '').replace(/\/$/, '');
    this.key = configService?.get<string>('AZURE_FORM_RECOGNIZER_KEY') ?? '';
  }

  async scan(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (!this.endpoint || !this.key) {
      return { items: [], rawText: 'Azure Form Recognizer not configured. Set AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY.' };
    }

    try {
      // Step 1 — submit document for analysis
      const analyzeUrl = `${this.endpoint}/formrecognizer/documentModels/prebuilt-receipt:analyze?api-version=2023-07-31`;
      const submitRes = await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': this.key, 'Content-Type': mimeType },
        body: imageBuffer,
      });

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        throw new Error(`Azure submit failed (${submitRes.status}): ${errText}`);
      }

      const operationLocation = submitRes.headers.get('operation-location');
      if (!operationLocation) throw new Error('No operation-location header returned');

      // Step 2 — poll until complete (up to 30s)
      const analysisResult = await this.pollResult(operationLocation);
      return this.mapResult(analysisResult);
    } catch (err: any) {
      this.logger.error(`Azure OCR failed: ${err?.message}`);
      return { items: [], rawText: `Azure OCR error: ${err?.message}` };
    }
  }

  private async pollResult(operationUrl: string, maxAttempts = 15): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(operationUrl, { headers: { 'Ocp-Apim-Subscription-Key': this.key } });
      if (!res.ok) throw new Error(`Poll failed (${res.status})`);
      const body = await res.json();
      if (body.status === 'succeeded') return body.analyzeResult;
      if (body.status === 'failed') throw new Error(`Azure analysis failed: ${JSON.stringify(body.error)}`);
    }
    throw new Error('Azure OCR timed out after 30 seconds');
  }

  private mapResult(analyzeResult: any): OcrResult {
    const doc = analyzeResult?.documents?.[0];
    if (!doc) return { items: [], rawText: analyzeResult?.content };

    const fields = doc.fields ?? {};
    const result: OcrResult = { items: [], rawText: analyzeResult?.content };

    // Merchant
    result.merchant = fields.MerchantName?.valueString ?? fields.MerchantName?.content;

    // Date
    const txDate = fields.TransactionDate?.valueDate ?? fields.TransactionDate?.content;
    if (txDate) result.date = new Date(txDate).toISOString();

    // Total
    result.total = fields.Total?.valueCurrency?.amount ?? fields.Total?.valueNumber;

    // Tax
    result.tax = fields.TotalTax?.valueCurrency?.amount ?? fields.TotalTax?.valueNumber;

    // Currency
    result.currency = fields.Total?.valueCurrency?.currencyCode;

    // Items
    const itemsField = fields.Items?.valueArray ?? [];
    for (const item of itemsField) {
      const f = item.valueObject ?? {};
      const description = f.Description?.valueString ?? f.Description?.content ?? '';
      const amount = f.TotalPrice?.valueCurrency?.amount ?? f.TotalPrice?.valueNumber ?? 0;
      const quantity = f.Quantity?.valueNumber;
      if (description) {
        const li: OcrLineItem = { description, amount };
        if (quantity != null) li.quantity = quantity;
        result.items.push(li);
      }
    }

    return result;
  }
}
