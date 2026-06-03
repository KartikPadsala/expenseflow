import { SettlementsService } from '../settlements.service';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';

const mockEventEmitter = { emit: jest.fn() };

const mockPrisma = {
  settlement: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null), // no existing PENDING by default
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  groupMember: {
    findUnique: jest.fn().mockResolvedValue({ userId: 'u1', groupId: 'g1' }), // member by default
    findMany: jest.fn().mockResolvedValue([{ userId: 'u2' }, { userId: 'u3' }]), // payees are members
  },
  user: { findUnique: jest.fn().mockResolvedValue({ displayName: 'Test User' }) },
  $transaction: jest.fn((ops: any) => Promise.all(Array.isArray(ops) ? ops : [ops])),
};

describe('SettlementsService', () => {
  let service: SettlementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettlementsService(mockPrisma as any, mockEventEmitter as any);
  });

  describe('create', () => {
    it('creates a settlement with required fields', async () => {
      const settlement = { id: 's1', payerId: 'u1', payeeId: 'u2', amount: 50, currency: 'USD', status: 'PENDING', method: 'CASH', createdAt: new Date(), payer: {}, payee: {} };
      mockPrisma.settlement.findFirst.mockResolvedValue(null); // no existing PENDING
      mockPrisma.settlement.create.mockResolvedValue(settlement);

      const result = await service.create('u1', { payeeId: 'u2', amount: 50, currency: 'USD' });

      expect(mockPrisma.settlement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ payerId: 'u1', payeeId: 'u2', amount: 50 }) })
      );
      expect(result).toEqual(settlement);
    });

    it('defaults method to CASH when not provided', async () => {
      mockPrisma.settlement.findFirst.mockResolvedValue(null);
      mockPrisma.settlement.create.mockResolvedValue({ id: 's1', method: 'CASH', payer: {}, payee: {} });
      await service.create('u1', { payeeId: 'u2', amount: 25, currency: 'USD' });
      expect(mockPrisma.settlement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ method: 'CASH' }) })
      );
    });

    it('throws BadRequestException when payee equals payer (self-settlement)', async () => {
      await expect(service.create('u1', { payeeId: 'u1', amount: 50, currency: 'USD' }))
        .rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when PENDING settlement already exists for same payer/payee', async () => {
      mockPrisma.settlement.findFirst.mockResolvedValue({ id: 'existing', status: 'PENDING' });
      await expect(service.create('u1', { payeeId: 'u2', amount: 50, currency: 'USD' }))
        .rejects.toThrow(ConflictException);
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
      const s = { id: 's1', payerId: 'u1', payeeId: 'u2', status: 'PENDING', amount: 50, currency: 'USD' };
      mockPrisma.settlement.findUnique.mockResolvedValue(s);
      mockPrisma.settlement.update.mockResolvedValue({ ...s, status: 'COMPLETED' });

      const result = await service.complete('s1', 'u2');

      expect(mockPrisma.settlement.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
      );
      expect(result.status).toBe('COMPLETED');
    });

    it('throws ForbiddenException when called by payer', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 's1', payerId: 'u1', payeeId: 'u2', status: 'PENDING' });
      await expect(service.complete('s1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when settlement missing', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue(null);
      await expect(service.complete('s1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when settlement is already completed', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 's1', payerId: 'u1', payeeId: 'u2', status: 'COMPLETED' });
      await expect(service.complete('s1', 'u2')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when settlement is cancelled', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 's1', payerId: 'u1', payeeId: 'u2', status: 'CANCELLED' });
      await expect(service.complete('s1', 'u2')).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel', () => {
    it('allows payer to cancel a PENDING settlement', async () => {
      const s = { id: 's1', payerId: 'u1', payeeId: 'u2', status: 'PENDING' };
      mockPrisma.settlement.findUnique.mockResolvedValue(s);
      mockPrisma.settlement.update.mockResolvedValue({ ...s, status: 'CANCELLED', cancelledAt: new Date() });
      await service.cancel('s1', 'u1');
      expect(mockPrisma.settlement.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED', cancelledAt: expect.any(Date) }) })
      );
    });

    it('allows payee to cancel a PENDING settlement', async () => {
      const s = { id: 's1', payerId: 'u1', payeeId: 'u2', status: 'PENDING' };
      mockPrisma.settlement.findUnique.mockResolvedValue(s);
      mockPrisma.settlement.update.mockResolvedValue({ ...s, status: 'CANCELLED', cancelledAt: new Date() });
      await service.cancel('s1', 'u2');
      expect(mockPrisma.settlement.update).toHaveBeenCalled();
    });

    it('sets cancelledAt timestamp on cancel', async () => {
      const s = { id: 's1', payerId: 'u1', payeeId: 'u2', status: 'PENDING' };
      mockPrisma.settlement.findUnique.mockResolvedValue(s);
      mockPrisma.settlement.update.mockResolvedValue({ ...s, status: 'CANCELLED', cancelledAt: new Date() });
      await service.cancel('s1', 'u1');
      const updateCall = mockPrisma.settlement.update.mock.calls[0][0];
      expect(updateCall.data.cancelledAt).toBeInstanceOf(Date);
    });

    it('throws ForbiddenException for unrelated user', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 's1', payerId: 'u1', payeeId: 'u2', status: 'PENDING' });
      await expect(service.cancel('s1', 'u3')).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when settlement is already cancelled', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 's1', payerId: 'u1', payeeId: 'u2', status: 'CANCELLED' });
      await expect(service.cancel('s1', 'u1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when trying to cancel a completed settlement', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 's1', payerId: 'u1', payeeId: 'u2', status: 'COMPLETED' });
      await expect(service.cancel('s1', 'u1')).rejects.toThrow(ConflictException);
    });
  });

  describe('bulkCreate', () => {
    it('throws BadRequestException for self-settlement', async () => {
      await expect(
        service.bulkCreate('u1', { groupId: 'g1', settlements: [{ payeeId: 'u1', amount: 50, currency: 'USD' }] })
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when caller is not a group member', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValueOnce(null); // caller not a member
      await expect(
        service.bulkCreate('u1', { groupId: 'g1', settlements: [{ payeeId: 'u2', amount: 50, currency: 'USD' }] })
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when a payee is not a group member', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValueOnce({ userId: 'u1' }); // caller is member
      mockPrisma.groupMember.findMany.mockResolvedValueOnce([]); // no payees found as members
      await expect(
        service.bulkCreate('u1', { groupId: 'g1', settlements: [{ payeeId: 'u99', amount: 50, currency: 'USD' }] })
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when PENDING settlement already exists for same pair', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValueOnce({ userId: 'u1' });
      mockPrisma.groupMember.findMany.mockResolvedValueOnce([{ userId: 'u2' }]);
      mockPrisma.settlement.findMany.mockResolvedValueOnce([{ payeeId: 'u2' }]);
      await expect(
        service.bulkCreate('u1', { groupId: 'g1', settlements: [{ payeeId: 'u2', amount: 50, currency: 'USD' }] })
      ).rejects.toThrow(ConflictException);
    });

    it('creates settlements for valid input', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValueOnce({ userId: 'u1' });
      mockPrisma.groupMember.findMany.mockResolvedValueOnce([{ userId: 'u2' }]);
      mockPrisma.settlement.findMany.mockResolvedValueOnce([]); // no existing PENDING
      const created = { id: 's1', payerId: 'u1', payeeId: 'u2', amount: 50, payer: {}, payee: {} };
      mockPrisma.settlement.create.mockResolvedValueOnce(created);
      const result = await service.bulkCreate('u1', {
        groupId: 'g1',
        settlements: [{ payeeId: 'u2', amount: 50, currency: 'USD' }],
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toEqual(created);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      (mockPrisma.settlement as any).aggregate = jest.fn();
      (mockPrisma.settlement as any).count = jest.fn();
    });

    it('returns totals and counts for current user', async () => {
      (mockPrisma.settlement as any).aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100 } })  // totalOwed
        .mockResolvedValueOnce({ _sum: { amount: 50 } });  // totalOwing
      (mockPrisma.settlement as any).count
        .mockResolvedValueOnce(3)   // pendingCount
        .mockResolvedValueOnce(10)  // completedCount
        .mockResolvedValueOnce(2);  // cancelledCount

      const stats = await service.getStats('u1');

      expect(stats).toEqual({ totalOwed: 100, totalOwing: 50, pendingCount: 3, completedCount: 10, cancelledCount: 2 });
    });

    it('returns zeros when user has no settlements', async () => {
      (mockPrisma.settlement as any).aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });
      (mockPrisma.settlement as any).count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const stats = await service.getStats('u1');

      expect(stats).toEqual({ totalOwed: 0, totalOwing: 0, pendingCount: 0, completedCount: 0, cancelledCount: 0 });
    });
  });
});
