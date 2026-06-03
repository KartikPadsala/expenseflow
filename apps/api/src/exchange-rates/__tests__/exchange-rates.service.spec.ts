import { ExchangeRatesService } from '../exchange-rates.service';

const mockPrisma = {
  exchangeRate: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(undefined),
};

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExchangeRatesService(mockPrisma as any, mockConfigService as any);
  });

  describe('getRate', () => {
    it('returns 1 for same currency', async () => {
      const rate = await service.getRate('USD', 'USD');
      expect(rate).toBe(1);
    });

    it('returns stored direct rate when available', async () => {
      mockPrisma.exchangeRate.findUnique.mockResolvedValue({ rate: '1.25' });
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);
      const rate = await service.getRate('USD', 'EUR', '2024-01-15');
      expect(rate).toBe(1.25);
    });

    it('returns most recent rate when no date-exact match', async () => {
      mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: '1.30' });
      const rate = await service.getRate('USD', 'GBP');
      expect(rate).toBe(1.30);
    });

    it('falls back to 1 when no rates available and fetch fails', async () => {
      mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);
      mockPrisma.exchangeRate.upsert.mockRejectedValue(new Error('DB error'));
      // cross-rate path — both lookups return null
      const rate = await service.getCrossRate('EUR', 'GBP');
      expect(rate).toBe(1);
    });
  });

  describe('getCrossRate', () => {
    it('returns 1 for same currency', async () => {
      const rate = await service.getCrossRate('EUR', 'EUR');
      expect(rate).toBe(1);
    });

    it('computes EUR→GBP via USD: (USD→GBP) / (USD→EUR)', async () => {
      // USD→EUR = 0.92, USD→GBP = 0.79
      // EUR→GBP = 0.79 / 0.92 ≈ 0.858696
      mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
      mockPrisma.exchangeRate.findFirst
        .mockResolvedValueOnce({ rate: '0.92' }) // USD→EUR
        .mockResolvedValueOnce({ rate: '0.79' }) // USD→GBP
      const rate = await service.getCrossRate('EUR', 'GBP');
      expect(rate).toBeCloseTo(0.858696, 4);
    });

    it('handles USD→X directly (no cross calculation)', async () => {
      mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: '1.35' });
      const rate = await service.getCrossRate('USD', 'CAD');
      expect(rate).toBe(1.35);
    });

    it('handles X→USD using 1/rate', async () => {
      mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: '0.92' }); // USD→EUR
      const rate = await service.getCrossRate('EUR', 'USD');
      expect(rate).toBeCloseTo(1 / 0.92, 4);
    });
  });

  describe('convertAmount', () => {
    it('returns same amount for same currency', async () => {
      const result = await service.convertAmount(100, 'USD', 'USD');
      expect(result).toEqual({ convertedAmount: 100, rate: 1 });
    });

    it('converts USD to EUR correctly', async () => {
      mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: '0.92' });
      const result = await service.convertAmount(100, 'USD', 'EUR');
      expect(result.convertedAmount).toBe(92);
      expect(result.rate).toBe(0.92);
    });

    it('rounds to 2 decimal places', async () => {
      mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({ rate: '0.8573' });
      const result = await service.convertAmount(100, 'USD', 'GBP');
      expect(result.convertedAmount).toBe(85.73);
    });
  });

  describe('getLatestRates', () => {
    it('returns rates with USD base unchanged', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({ date: new Date() }); // skip fetch
      mockPrisma.exchangeRate.findMany.mockResolvedValue([
        { toCurrency: 'EUR', rate: '0.92' },
        { toCurrency: 'GBP', rate: '0.79' },
        { toCurrency: 'CAD', rate: '1.35' },
      ]);
      const result = await service.getLatestRates('USD');
      expect(result['EUR']).toBe(0.92);
      expect(result['GBP']).toBe(0.79);
    });

    it('rebases rates to EUR when requested', async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue({ date: new Date() });
      mockPrisma.exchangeRate.findMany.mockResolvedValue([
        { toCurrency: 'EUR', rate: '0.92' },
        { toCurrency: 'GBP', rate: '0.79' },
        { toCurrency: 'USD', rate: '1.0' },
      ]);
      const result = await service.getLatestRates('EUR');
      // USD in EUR base = 1 / 0.92 ≈ 1.087
      expect(result['USD']).toBeCloseTo(1 / 0.92, 3);
      expect(result['EUR']).toBe(1);
    });
  });
});
