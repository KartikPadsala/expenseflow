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
  });
});
