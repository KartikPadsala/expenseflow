import { GoogleOcrProvider } from '../providers/google-ocr.provider';
import { ConfigService } from '@nestjs/config';

function makeConfig(values: Record<string, string> = {}) {
  return { get: (k: string) => values[k] } as unknown as ConfigService;
}

// Mock @google-cloud/vision
jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
    documentTextDetection: jest.fn(),
  })),
}));

const { ImageAnnotatorClient } = require('@google-cloud/vision');

describe('GoogleOcrProvider', () => {
  let mockDocumentTextDetection: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDocumentTextDetection = jest.fn();
    ImageAnnotatorClient.mockImplementation(() => ({
      documentTextDetection: mockDocumentTextDetection,
    }));
  });

  it('extracts merchant, total, date, tax from structured receipt text', async () => {
    const rawText = [
      'STARBUCKS COFFEE',
      'Date: 2024-03-15',
      'Latte Grande         5.50',
      'Blueberry Muffin     3.75',
      'Tax                  0.83',
      'Total               10.08',
    ].join('\n');

    mockDocumentTextDetection.mockResolvedValue([{ fullTextAnnotation: { text: rawText } }]);

    const provider = new GoogleOcrProvider(makeConfig({ GOOGLE_VISION_API_KEY: 'key' }));
    const result = await provider.scan(Buffer.from('img'), 'image/jpeg');

    expect(result.merchant).toBe('STARBUCKS COFFEE');
    expect(result.total).toBe(10.08);
    expect(result.tax).toBe(0.83);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some((i) => i.description.includes('Latte'))).toBe(true);
  });

  it('detects USD from dollar sign in text', async () => {
    const rawText = 'SHOP\nItem $5.00\nTotal $5.00';
    mockDocumentTextDetection.mockResolvedValue([{ fullTextAnnotation: { text: rawText } }]);

    const provider = new GoogleOcrProvider(makeConfig({ GOOGLE_VISION_API_KEY: 'key' }));
    const result = await provider.scan(Buffer.from('img'), 'image/png');

    expect(result.currency).toBe('USD');
  });

  it('detects EUR from euro sign', async () => {
    const rawText = 'Cafe\nCoffee €3.50\nTotal €3.50';
    mockDocumentTextDetection.mockResolvedValue([{ fullTextAnnotation: { text: rawText } }]);

    const provider = new GoogleOcrProvider(makeConfig({ GOOGLE_VISION_API_KEY: 'key' }));
    const result = await provider.scan(Buffer.from('img'), 'image/jpeg');

    expect(result.currency).toBe('EUR');
  });

  it('returns graceful fallback on Vision API error', async () => {
    mockDocumentTextDetection.mockRejectedValue(new Error('permission denied'));

    const provider = new GoogleOcrProvider(makeConfig({ GOOGLE_VISION_API_KEY: 'key' }));
    const result = await provider.scan(Buffer.from('img'), 'image/jpeg');

    expect(result.items).toEqual([]);
    expect(result.rawText).toContain('Google Vision OCR error');
  });

  it('returns items array on empty text', async () => {
    mockDocumentTextDetection.mockResolvedValue([{ fullTextAnnotation: { text: '' } }]);

    const provider = new GoogleOcrProvider(makeConfig({ GOOGLE_VISION_API_KEY: 'key' }));
    const result = await provider.scan(Buffer.from('img'), 'image/jpeg');

    expect(result.items).toEqual([]);
    expect(result.rawText).toBe('');
  });
});
