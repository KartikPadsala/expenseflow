import { SettlementsService } from '../settlements.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  settlement: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('SettlementsService', () => {
  let service: SettlementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettlementsService(mockPrisma as any);
  });

  describe('create', () => {
    it('creates a settlement with required fields', async () => {
      const settlement = { id: 's1', payerId: 'u1', payeeId: 'u2', amount: 50, currency: 'USD', status: 'PENDING', method: 'CASH', createdAt: new Date() };
      mockPrisma.settlement.create.mockResolvedValue(settlement);

      const result = await service.create('u1', { payeeId: 'u2', amount: 50, currency: 'USD' });

      expect(mockPrisma.settlement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ payerId: 'u1', payeeId: 'u2', amount: 50 }) })
      );
      expect(result).toEqual(settlement);
    });

    it('defaults method to CASH when not provided', async () => {
      mockPrisma.settlement.create.mockResolvedValue({ id: 's1', method: 'CASH' });
      await service.create('u1', { payeeId: 'u2', amount: 25, currency: 'USD' });
      expect(mockPrisma.settlement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ method: 'CASH' }) })
      );
    });
  });

  describe('findAll', () => {
    it('returns settlements for user as payer or payee', async () => {
      const settlements = [{ id: 's1' }, { id: 's2' }];
      mockPrisma.settlement.findMany.mockResolvedValue(settlements);

      const result = await service.findAll('u1');

      expect(mockPrisma.settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
      );
      expect(result).toEqual(settlements);
    });

    it('filters by groupId when provided', async () => {
      mockPrisma.settlement.findMany.mockResolvedValue([]);
      await service.findAll('u1', 'g1');
      expect(mockPrisma.settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ groupId: 'g1' }) })
      );
    });

    it('filters by status when provided', async () => {
      mockPrisma.settlement.findMany.mockResolvedValue([]);
      await service.findAll('u1', undefined, 'COMPLETED');
      expect(mockPrisma.settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'COMPLETED' }) })
      );
    });
  });

  describe('findOne', () => {
    it('returns settlement when user is payer', async () => {
      const s = { id: 's1', payerId: 'u1', payeeId: 'u2' };
      mockPrisma.settlement.findUnique.mockResolvedValue(s);
      const result = await service.findOne('s1', 'u1');
      expect(result).toEqual(s);
    });

    it('returns settlement when user is payee', async () => {
      const s = { id: 's1', payerId: 'u1', payeeId: 'u2' };
      mockPrisma.settlement.findUnique.mockResolvedValue(s);
      const result = await service.findOne('s1', 'u2');
      expect(result).toEqual(s);
    });

    it('throws NotFoundException when settlement does not exist', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue(null);
      await expect(service.findOne('s1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not a party', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 's1', payerId: 'u1', payeeId: 'u2' });
      await expect(service.findOne('s1', 'u3')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('complete', () => {
    it('marks settlement as completed when called by payee', async () => {
      const s = { id: 's1', payerId: 'u1', payeeId: 'u2', status: 'PENDING' };
      mockPrisma.settlement.findUnique.mockResolvedValue(s);
      mockPrisma.settlement.update.mockResolvedValue({ ...s, status: 'COMPLETED' });

      const result = await service.complete('s1', 'u2');

      expect(mockPrisma.settlement.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
      );
      expect(result.status).toBe('COMPLETED');
    });

    it('throws ForbiddenException when called by payer', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 's1', payerId: 'u1', payeeId: 'u2' });
      await expect(service.complete('s1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when settlement missing', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue(null);
      await expect(service.complete('s1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('allows payer to cancel', async () => {
      const s = { id: 's1', payerId: 'u1', payeeId: 'u2' };
      mockPrisma.settlement.findUnique.mockResolvedValue(s);
      mockPrisma.settlement.update.mockResolvedValue({ ...s, status: 'CANCELLED' });
      await service.cancel('s1', 'u1');
      expect(mockPrisma.settlement.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } })
      );
    });

    it('allows payee to cancel', async () => {
      const s = { id: 's1', payerId: 'u1', payeeId: 'u2' };
      mockPrisma.settlement.findUnique.mockResolvedValue(s);
      mockPrisma.settlement.update.mockResolvedValue({ ...s, status: 'CANCELLED' });
      await service.cancel('s1', 'u2');
      expect(mockPrisma.settlement.update).toHaveBeenCalled();
    });

    it('throws ForbiddenException for unrelated user', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 's1', payerId: 'u1', payeeId: 'u2' });
      await expect(service.cancel('s1', 'u3')).rejects.toThrow(ForbiddenException);
    });
  });
});
