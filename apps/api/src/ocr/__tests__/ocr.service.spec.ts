import { OcrService } from '../ocr.service';
import { ConfigService } from '@nestjs/config';

function makeConfig(values: Record<string, string> = {}) {
  return { get: (k: string) => values[k] } as unknown as ConfigService;
}

describe('OcrService', () => {
  it('selects OpenAI provider by default', () => {
    const svc = new OcrService(makeConfig());
    expect(svc.getProviderName()).toBe('openai');
  });

  it('selects OpenAI when OCR_PROVIDER=openai', () => {
    const svc = new OcrService(makeConfig({ OCR_PROVIDER: 'openai' }));
    expect(svc.getProviderName()).toBe('openai');
  });

  it('selects Google when OCR_PROVIDER=google', () => {
    const svc = new OcrService(makeConfig({ OCR_PROVIDER: 'google' }));
    expect(svc.getProviderName()).toBe('google');
  });

  it('selects Azure when OCR_PROVIDER=azure', () => {
    const svc = new OcrService(makeConfig({ OCR_PROVIDER: 'azure' }));
    expect(svc.getProviderName()).toBe('azure');
  });

  it('delegates scan() to the selected provider', async () => {
    const svc = new OcrService(makeConfig({ OCR_PROVIDER: 'google' }));
    const buf = Buffer.from('fake-image');
    // Google provider without a key returns a graceful fallback, not a throw
    const result = await svc.scan(buf, 'image/jpeg');
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
  });
});
