import { BadRequestException } from '@nestjs/common';
import { OcrController } from '../ocr.controller';
import { OcrService } from '../ocr.service';

const mockOcrService = {
  scan: jest.fn(),
};

function makeController() {
  return new OcrController(mockOcrService as unknown as OcrService);
}

const validFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'receipt',
  originalname: 'receipt.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: Buffer.from('fake-image'),
  size: 1024,
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
  ...overrides,
});

describe('OcrController', () => {
  let controller: OcrController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = makeController();
  });

  describe('scan', () => {
    it('calls ocrService.scan with buffer and mimetype', async () => {
      const file = validFile();
      const mockResult = { merchant: 'Starbucks', total: 12.5, items: [] };
      mockOcrService.scan.mockResolvedValue(mockResult);

      const result = await controller.scan(file);

      expect(mockOcrService.scan).toHaveBeenCalledWith(file.buffer, 'image/jpeg');
      expect(result).toEqual(mockResult);
    });

    it('throws BadRequestException when no file uploaded', async () => {
      await expect(controller.scan(undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for disallowed mimetype', async () => {
      const file = validFile({ mimetype: 'text/plain' });
      await expect(controller.scan(file)).rejects.toThrow(BadRequestException);
      await expect(controller.scan(file)).rejects.toThrow(/Unsupported file type/);
    });

    it('throws BadRequestException for video mimetype', async () => {
      const file = validFile({ mimetype: 'video/mp4' });
      await expect(controller.scan(file)).rejects.toThrow(BadRequestException);
    });

    it('accepts image/png', async () => {
      const file = validFile({ mimetype: 'image/png' });
      mockOcrService.scan.mockResolvedValue({ items: [] });
      await expect(controller.scan(file)).resolves.not.toThrow();
    });

    it('accepts application/pdf', async () => {
      const file = validFile({ mimetype: 'application/pdf' });
      mockOcrService.scan.mockResolvedValue({ items: [] });
      await expect(controller.scan(file)).resolves.not.toThrow();
    });

    it('accepts image/webp', async () => {
      const file = validFile({ mimetype: 'image/webp' });
      mockOcrService.scan.mockResolvedValue({ items: [] });
      await expect(controller.scan(file)).resolves.not.toThrow();
    });
  });
});
