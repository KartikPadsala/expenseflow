import { OpenAiOcrProvider } from '../providers/openai-ocr.provider';
import { ConfigService } from '@nestjs/config';

function makeConfig(values: Record<string, string> = {}) {
  return { get: (k: string) => values[k] } as unknown as ConfigService;
}

/** Create provider and replace its private OpenAI client with a mock */
function makeProvider(createFn: jest.Mock) {
  const provider = new OpenAiOcrProvider(makeConfig({ OPENAI_API_KEY: 'not-configured' }));
  (provider as any).client = { chat: { completions: { create: createFn } } };
  return provider;
}

describe('OpenAiOcrProvider', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    mockCreate = jest.fn();
  });

  it('parses well-formed JSON response', async () => {
    const receiptJson = {
      merchant: 'Starbucks',
      date: '2024-03-15',
      total: 12.50,
      tax: 1.25,
      currency: 'USD',
      items: [{ description: 'Latte', amount: 5.50, quantity: 1 }, { description: 'Muffin', amount: 3.75 }],
    };
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(receiptJson) } }] });

    const result = await makeProvider(mockCreate).scan(Buffer.from('img'), 'image/jpeg');

    expect(result.merchant).toBe('Starbucks');
    expect(result.total).toBe(12.50);
    expect(result.tax).toBe(1.25);
    expect(result.currency).toBe('USD');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].description).toBe('Latte');
    expect(result.items[0].amount).toBe(5.50);
  });

  it('extracts JSON embedded in surrounding text', async () => {
    const receiptJson = { merchant: 'Pizza Place', total: 22.00, items: [] };
    const content = `Here is the extracted data:\n\n${JSON.stringify(receiptJson)}\n\nDone.`;
    mockCreate.mockResolvedValue({ choices: [{ message: { content } }] });

    const result = await makeProvider(mockCreate).scan(Buffer.from('img'), 'image/png');

    expect(result.merchant).toBe('Pizza Place');
    expect(result.total).toBe(22.00);
  });

  it('returns empty items on malformed JSON', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'No JSON here.' } }] });

    const result = await makeProvider(mockCreate).scan(Buffer.from('img'), 'image/jpeg');

    expect(result.items).toEqual([]);
  });

  it('returns empty items when OpenAI throws', async () => {
    mockCreate.mockRejectedValue(new Error('rate limit'));

    const result = await makeProvider(mockCreate).scan(Buffer.from('img'), 'image/jpeg');

    expect(result.items).toEqual([]);
  });

  it('returns empty items when choices is empty', async () => {
    mockCreate.mockResolvedValue({ choices: [] });

    const result = await makeProvider(mockCreate).scan(Buffer.from('img'), 'image/jpeg');

    expect(result.items).toEqual([]);
  });

  it('encodes image as base64 data URL in the API call', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '{}' } }] });

    const imgBuf = Buffer.from('fake-image-bytes');
    await makeProvider(mockCreate).scan(imgBuf, 'image/png');

    const callArgs = mockCreate.mock.calls[0][0];
    const imgContent = callArgs.messages[0].content[1];
    expect(imgContent.image_url.url).toBe(`data:image/png;base64,${imgBuf.toString('base64')}`);
  });
});
