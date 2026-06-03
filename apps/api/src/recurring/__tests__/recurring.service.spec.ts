import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RecurringService } from '../recurring.service';

const mockPrisma = {
  recurringExpense: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  groupMember: {
    findMany: jest.fn(),
  },
};

const mockExpensesService = {
  create: jest.fn().mockResolvedValue({ id: 'exp1' }),
};

const baseRecurring = {
  id: 'r1',
  description: 'Monthly Rent',
  amount: 1000,
  currency: 'USD',
  frequency: 'MONTHLY',
  splitMethod: 'EQUAL',
  nextDueDate: new Date('2024-01-01'),
  endDate: null,
  isActive: true,
  createdById: 'u1',
  paidById: 'u1',
  groupId: null,
  categoryId: null,
  notes: null,
  participantsJson: [{ userId: 'u1' }],
};

describe('RecurringService', () => {
  let service: RecurringService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RecurringService(mockPrisma as any, mockExpensesService as any);
  });

  describe('findOne', () => {
    it('returns recurring expense for owner', async () => {
      mockPrisma.recurringExpense.findUnique.mockResolvedValue(baseRecurring);
      const result = await service.findOne('r1', 'u1');
      expect(result).toEqual(baseRecurring);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.recurringExpense.findUnique.mockResolvedValue(null);
      await expect(service.findOne('r1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong user', async () => {
      mockPrisma.recurringExpense.findUnique.mockResolvedValue(baseRecurring);
      await expect(service.findOne('r1', 'u2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('pause / resume', () => {
    it('sets isActive to false on pause', async () => {
      mockPrisma.recurringExpense.findUnique.mockResolvedValue(baseRecurring);
      mockPrisma.recurringExpense.update.mockResolvedValue({ ...baseRecurring, isActive: false });
      const result = await service.pause('r1', 'u1');
      expect(mockPrisma.recurringExpense.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
      expect(result.isActive).toBe(false);
    });

    it('sets isActive to true on resume', async () => {
      mockPrisma.recurringExpense.findUnique.mockResolvedValue({ ...baseRecurring, isActive: false });
      mockPrisma.recurringExpense.update.mockResolvedValue({ ...baseRecurring, isActive: true });
      await service.resume('r1', 'u1');
      expect(mockPrisma.recurringExpense.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
    });
  });

  describe('delete', () => {
    it('deletes and returns message', async () => {
      mockPrisma.recurringExpense.findUnique.mockResolvedValue(baseRecurring);
      mockPrisma.recurringExpense.delete.mockResolvedValue({});
      const result = await service.delete('r1', 'u1');
      expect(result).toEqual({ message: 'Recurring expense deleted' });
      expect(mockPrisma.recurringExpense.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });
  });

  describe('processDueExpenses', () => {
    it('creates expense and advances nextDueDate for due item', async () => {
      const dueItem = { ...baseRecurring, nextDueDate: new Date('2024-01-01') };
      mockPrisma.recurringExpense.findMany.mockResolvedValue([dueItem]);
      mockPrisma.recurringExpense.update.mockResolvedValue(dueItem);

      const result = await service.processDueExpenses();

      expect(mockExpensesService.create).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          description: 'Monthly Rent',
          amount: 1000,
          currency: 'USD',
        }),
      );
      expect(mockPrisma.recurringExpense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ nextDueDate: expect.any(Date) }),
        }),
      );
      expect(result.processed).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('auto-deactivates expired recurring expenses', async () => {
      const expiredItem = {
        ...baseRecurring,
        nextDueDate: new Date('2024-01-01'),
        endDate: new Date('2023-12-31'),
      };
      mockPrisma.recurringExpense.findMany.mockResolvedValue([expiredItem]);
      mockPrisma.recurringExpense.update.mockResolvedValue({ ...expiredItem, isActive: false });

      const result = await service.processDueExpenses();

      expect(mockPrisma.recurringExpense.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
      expect(mockExpensesService.create).not.toHaveBeenCalled();
      expect(result.processed).toBe(0);
    });

    it('handles multiple due items', async () => {
      const items = [
        { ...baseRecurring, id: 'r1', nextDueDate: new Date('2024-01-01') },
        { ...baseRecurring, id: 'r2', nextDueDate: new Date('2024-01-01') },
      ];
      mockPrisma.recurringExpense.findMany.mockResolvedValue(items);
      mockPrisma.recurringExpense.update.mockResolvedValue({});

      const result = await service.processDueExpenses();
      expect(result.processed).toBe(2);
      expect(mockExpensesService.create).toHaveBeenCalledTimes(2);
    });

    it('counts errors without crashing', async () => {
      mockPrisma.recurringExpense.findMany.mockResolvedValue([
        { ...baseRecurring, nextDueDate: new Date('2024-01-01') },
      ]);
      mockExpensesService.create.mockRejectedValueOnce(new Error('DB error'));

      const result = await service.processDueExpenses();
      expect(result.errors).toBe(1);
      expect(result.processed).toBe(0);
    });

    it('returns zero when no due expenses', async () => {
      mockPrisma.recurringExpense.findMany.mockResolvedValue([]);
      const result = await service.processDueExpenses();
      expect(result).toEqual({ processed: 0, errors: 0 });
    });

    it('filters participants to current group members', async () => {
      const dueItem = {
        ...baseRecurring,
        groupId: 'g1',
        nextDueDate: new Date('2024-01-01'),
        participantsJson: [
          { userId: 'u1' },
          { userId: 'u-removed' }, // was removed from group
        ],
      };
      mockPrisma.recurringExpense.findMany.mockResolvedValue([dueItem]);
      mockPrisma.groupMember.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.recurringExpense.update.mockResolvedValue(dueItem);

      await service.processDueExpenses();

      expect(mockExpensesService.create).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          participants: [{ userId: 'u1' }], // u-removed filtered out
        }),
      );
    });

    it('deactivates when nextDueDate passes endDate after advance', async () => {
      const dueItem = {
        ...baseRecurring,
        frequency: 'MONTHLY',
        nextDueDate: new Date('2024-01-31'),
        endDate: new Date('2024-02-10'), // next would be Feb 29, after end
      };
      mockPrisma.recurringExpense.findMany.mockResolvedValue([dueItem]);
      mockPrisma.recurringExpense.update.mockResolvedValue(dueItem);

      await service.processDueExpenses();

      const updateCall = mockPrisma.recurringExpense.update.mock.calls[0][0];
      // next date Feb 29 > endDate Feb 10 → should deactivate
      expect(updateCall.data.isActive).toBe(false);
    });
  });

  describe('create', () => {
    it('creates a recurring expense with correct fields', async () => {
      const created = {
        ...baseRecurring,
        id: 'r-new',
        nextDueDate: new Date('2024-06-01'),
      };
      mockPrisma.recurringExpense.create.mockResolvedValue(created);

      const dto = {
        description: 'Monthly Rent',
        amount: 1000,
        currency: 'USD',
        frequency: 'MONTHLY' as const,
        splitMethod: 'EQUAL',
        startDate: '2024-06-01',
        participants: [{ userId: 'u1' }],
      };

      const result = await service.create('u1', dto as any);

      expect(mockPrisma.recurringExpense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Monthly Rent',
            amount: 1000,
            currency: 'USD',
            frequency: 'MONTHLY',
            isActive: true,
            createdById: 'u1',
          }),
        }),
      );
      expect(result.id).toBe('r-new');
    });

    it('sets endDate when provided', async () => {
      mockPrisma.recurringExpense.create.mockResolvedValue(baseRecurring);

      await service.create('u1', {
        description: 'Subscription',
        amount: 9.99,
        currency: 'USD',
        frequency: 'MONTHLY',
        splitMethod: 'EQUAL',
        startDate: '2024-06-01',
        endDate: '2024-12-31',
        participants: [{ userId: 'u1' }],
      } as any);

      const createData = mockPrisma.recurringExpense.create.mock.calls[0][0].data;
      expect(createData.endDate).toEqual(new Date('2024-12-31'));
    });

    it('paidById defaults to creator when not specified', async () => {
      mockPrisma.recurringExpense.create.mockResolvedValue(baseRecurring);

      await service.create('u1', {
        description: 'Rent',
        amount: 500,
        currency: 'USD',
        frequency: 'MONTHLY',
        splitMethod: 'EQUAL',
        startDate: '2024-06-01',
        participants: [{ userId: 'u1' }],
      } as any);

      const createData = mockPrisma.recurringExpense.create.mock.calls[0][0].data;
      expect(createData.paidById).toBe('u1');
    });
  });

  describe('update', () => {
    it('updates description and amount', async () => {
      mockPrisma.recurringExpense.findUnique.mockResolvedValue(baseRecurring);
      mockPrisma.recurringExpense.update.mockResolvedValue({
        ...baseRecurring, description: 'Updated Rent', amount: 1200,
      });

      const result = await service.update('r1', 'u1', {
        description: 'Updated Rent',
        amount: 1200,
      });

      expect(mockPrisma.recurringExpense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1' },
          data: expect.objectContaining({ description: 'Updated Rent', amount: 1200 }),
        }),
      );
      expect(result.description).toBe('Updated Rent');
    });

    it('throws ForbiddenException when non-owner tries to update', async () => {
      mockPrisma.recurringExpense.findUnique.mockResolvedValue(baseRecurring);

      await expect(
        service.update('r1', 'other-user', { description: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not overwrite fields not included in dto', async () => {
      mockPrisma.recurringExpense.findUnique.mockResolvedValue(baseRecurring);
      mockPrisma.recurringExpense.update.mockResolvedValue(baseRecurring);

      await service.update('r1', 'u1', { notes: 'New note' });

      const updateData = mockPrisma.recurringExpense.update.mock.calls[0][0].data;
      expect(updateData.description).toBeUndefined();
      expect(updateData.amount).toBeUndefined();
      expect(updateData.notes).toBe('New note');
    });
  });

  describe('findAll', () => {
    it('returns all recurring expenses for user ordered by nextDueDate', async () => {
      const items = [baseRecurring, { ...baseRecurring, id: 'r2', description: 'Netflix' }];
      mockPrisma.recurringExpense.findMany.mockResolvedValue(items);

      const result = await service.findAll('u1');

      expect(mockPrisma.recurringExpense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdById: 'u1' },
          orderBy: { nextDueDate: 'asc' },
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('returns empty array when user has no recurring expenses', async () => {
      mockPrisma.recurringExpense.findMany.mockResolvedValue([]);
      const result = await service.findAll('u1');
      expect(result).toEqual([]);
    });
  });
});
