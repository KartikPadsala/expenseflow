import { AzureOcrProvider } from '../providers/azure-ocr.provider';
import { ConfigService } from '@nestjs/config';

function makeConfig(values: Record<string, string> = {}) {
  return { get: (k: string) => values[k] } as unknown as ConfigService;
}

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AzureOcrProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns unconfigured message when endpoint/key missing', async () => {
    const provider = new AzureOcrProvider(makeConfig());
    const result = await provider.scan(Buffer.from('img'), 'image/jpeg');
    expect(result.items).toEqual([]);
    expect(result.rawText).toContain('not configured');
  });

  it('submits document and maps receipt fields from analyzeResult', async () => {
    const analyzeResult = {
      content: 'Raw text here',
      documents: [{
        fields: {
          MerchantName: { valueString: 'Whole Foods' },
          TransactionDate: { valueDate: '2024-04-01' },
          Total: { valueCurrency: { amount: 55.20, currencyCode: 'USD' } },
          TotalTax: { valueCurrency: { amount: 4.10 } },
          Items: {
            valueArray: [
              { valueObject: { Description: { valueString: 'Organic Milk' }, TotalPrice: { valueCurrency: { amount: 6.99 } }, Quantity: { valueNumber: 2 } } },
              { valueObject: { Description: { valueString: 'Apples' }, TotalPrice: { valueCurrency: { amount: 3.50 } } } },
            ],
          },
        },
      }],
    };

    // First fetch: submit — returns 202 with operation-location header
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'https://azure.example.com/operations/abc123' },
        text: async () => '',
      })
      // Second fetch: poll — returns succeeded
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'succeeded', analyzeResult }),
      });

    const provider = new AzureOcrProvider(
      makeConfig({ AZURE_FORM_RECOGNIZER_ENDPOINT: 'https://azure.example.com', AZURE_FORM_RECOGNIZER_KEY: 'secret' }),
    );
    const result = await provider.scan(Buffer.from('img'), 'image/jpeg');

    expect(result.merchant).toBe('Whole Foods');
    expect(result.total).toBe(55.20);
    expect(result.tax).toBe(4.10);
    expect(result.currency).toBe('USD');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].description).toBe('Organic Milk');
    expect(result.items[0].quantity).toBe(2);
    expect(result.items[1].description).toBe('Apples');
  });

  it('returns error message when submit returns non-200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const provider = new AzureOcrProvider(
      makeConfig({ AZURE_FORM_RECOGNIZER_ENDPOINT: 'https://azure.example.com', AZURE_FORM_RECOGNIZER_KEY: 'bad-key' }),
    );
    const result = await provider.scan(Buffer.from('img'), 'image/jpeg');
    expect(result.items).toEqual([]);
    expect(result.rawText).toContain('Azure OCR error');
  });

  it('returns error message when poll returns failed status', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'https://azure.example.com/operations/abc' },
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'failed', error: { message: 'Bad document' } }),
      });

    const provider = new AzureOcrProvider(
      makeConfig({ AZURE_FORM_RECOGNIZER_ENDPOINT: 'https://azure.example.com', AZURE_FORM_RECOGNIZER_KEY: 'key' }),
    );
    const result = await provider.scan(Buffer.from('img'), 'image/jpeg');
    expect(result.items).toEqual([]);
    expect(result.rawText).toContain('Azure OCR error');
  });
});
