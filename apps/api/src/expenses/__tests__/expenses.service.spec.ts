import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExpensesService } from '../expenses.service';

const mockPrisma = {
  expense: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  groupMember: {
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  settlement: {
    updateMany: jest.fn(),
  },
};

const mockExchangeRates = {
  convertAmount: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

function makeService() {
  return new ExpensesService(
    mockPrisma as any,
    mockExchangeRates as any,
    mockEventEmitter as any,
  );
}

const USER_A = 'user-a';
const USER_B = 'user-b';
const GROUP_ID = 'group-1';

const baseDto = {
  description: 'Dinner',
  amount: 100,
  currency: 'USD',
  date: '2024-06-01',
  splitMethod: 'EQUAL' as const,
  participants: [
    { userId: USER_A, owedAmount: 50 },
    { userId: USER_B, owedAmount: 50 },
  ],
};

const createdExpense = {
  id: 'exp-1',
  groupId: GROUP_ID,
  description: 'Dinner',
  amount: '100.00',
  currency: 'USD',
  convertedAmount: null,
  baseCurrency: null,
  exchangeRate: null,
  paidById: USER_A,
  participants: [
    { userId: USER_A, user: { id: USER_A, displayName: 'Alice', avatarUrl: null } },
    { userId: USER_B, user: { id: USER_B, displayName: 'Bob', avatarUrl: null } },
  ],
  category: null,
  paidBy: { id: USER_A, displayName: 'Alice', avatarUrl: null },
};

describe('ExpensesService', () => {
  let service: ExpensesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService();
    // Default: user has USD as defaultCurrency
    mockPrisma.user.findUnique.mockResolvedValue({ defaultCurrency: 'USD' });
  });

  // ─── CREATE ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a same-currency expense without conversion', async () => {
      mockPrisma.groupMember.findMany.mockResolvedValue([
        { userId: USER_A },
        { userId: USER_B },
      ]);
      mockPrisma.expense.create.mockResolvedValue(createdExpense);

      const result = await service.create(USER_A, { ...baseDto, groupId: GROUP_ID });

      expect(mockExchangeRates.convertAmount).not.toHaveBeenCalled();
      expect(mockPrisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'USD',
            paidById: USER_A,
          }),
        }),
      );
      expect(result).toEqual(createdExpense);
    });

    it('converts EUR expense to USD base currency', async () => {
      mockPrisma.groupMember.findMany.mockResolvedValue([
        { userId: USER_A },
        { userId: USER_B },
      ]);
      mockExchangeRates.convertAmount.mockResolvedValue({ convertedAmount: 92, rate: 0.92 });
      mockPrisma.expense.create.mockResolvedValue({
        ...createdExpense,
        currency: 'EUR',
        convertedAmount: '92.00',
        baseCurrency: 'USD',
        exchangeRate: '0.920000',
      });

      const result = await service.create(USER_A, {
        ...baseDto,
        currency: 'EUR',
        groupId: GROUP_ID,
      });

      expect(mockExchangeRates.convertAmount).toHaveBeenCalledWith(
        100, 'EUR', 'USD', '2024-06-01',
      );
      expect(mockPrisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'EUR',
            convertedAmount: 92,
            baseCurrency: 'USD',
            exchangeRate: 0.92,
          }),
        }),
      );
      expect(Number(result.convertedAmount)).toBe(92);
    });

    it('uses group member base currency for conversion when user has non-USD default', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ defaultCurrency: 'EUR' });
      mockPrisma.groupMember.findMany.mockResolvedValue([
        { userId: USER_A },
        { userId: USER_B },
      ]);
      mockExchangeRates.convertAmount.mockResolvedValue({ convertedAmount: 115.5, rate: 1.155 });
      mockPrisma.expense.create.mockResolvedValue({
        ...createdExpense,
        currency: 'GBP',
        convertedAmount: '115.50',
        baseCurrency: 'EUR',
        exchangeRate: '1.155000',
      });

      await service.create(USER_A, { ...baseDto, currency: 'GBP', groupId: GROUP_ID });

      expect(mockExchangeRates.convertAmount).toHaveBeenCalledWith(
        100, 'GBP', 'EUR', '2024-06-01',
      );
    });

    it('skips conversion when expense currency matches user base currency', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ defaultCurrency: 'EUR' });
      mockPrisma.groupMember.findMany.mockResolvedValue([
        { userId: USER_A },
        { userId: USER_B },
      ]);
      mockPrisma.expense.create.mockResolvedValue(createdExpense);

      await service.create(USER_A, { ...baseDto, currency: 'EUR', groupId: GROUP_ID });

      expect(mockExchangeRates.convertAmount).not.toHaveBeenCalled();
    });

    it('rejects expense when participants are not group members', async () => {
      mockPrisma.groupMember.findMany.mockResolvedValue([{ userId: USER_A }]); // USER_B not a member

      await expect(
        service.create(USER_A, { ...baseDto, groupId: GROUP_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates expense without group (personal expense)', async () => {
      mockPrisma.expense.create.mockResolvedValue({ ...createdExpense, groupId: null });

      const result = await service.create(USER_A, {
        ...baseDto,
        groupId: undefined,
      });

      expect(mockPrisma.groupMember.findMany).not.toHaveBeenCalled();
      expect(result.groupId).toBeNull();
    });

    it('throws when split amounts do not match total', async () => {
      mockPrisma.groupMember.findMany.mockResolvedValue([
        { userId: USER_A },
        { userId: USER_B },
      ]);

      // Force a bad split (unequal, amounts don't sum to total)
      await expect(
        service.create(USER_A, {
          ...baseDto,
          splitMethod: 'UNEQUAL' as any,
          participants: [
            { userId: USER_A, owedAmount: 30 },
            { userId: USER_B, owedAmount: 30 }, // 60 ≠ 100
          ],
          groupId: GROUP_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── FIND ONE ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns expense with converted amount fields', async () => {
      const expense = {
        ...createdExpense,
        currency: 'EUR',
        convertedAmount: '92.00',
        baseCurrency: 'USD',
        exchangeRate: '0.920000',
        items: [],
        attachments: [],
      };
      mockPrisma.expense.findFirst.mockResolvedValue(expense);

      const result = await service.findOne('exp-1', USER_A);

      expect(result.currency).toBe('EUR');
      expect(Number(result.convertedAmount)).toBe(92);
      expect(result.baseCurrency).toBe('USD');
    });

    it('throws NotFoundException when expense not found', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing', USER_A)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── DELETE ───────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('soft-deletes expense for creator', async () => {
      const expense = { ...createdExpense, createdById: USER_A, items: [], attachments: [] };
      mockPrisma.expense.findFirst.mockResolvedValue(expense);
      mockPrisma.expense.update.mockResolvedValue({ ...expense, isDeleted: true });

      await service.delete('exp-1', USER_A);
      expect(mockPrisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDeleted: true } }),
      );
    });

    it('throws ForbiddenException when non-creator tries to delete', async () => {
      const expense = { ...createdExpense, createdById: 'other-user', items: [], attachments: [] };
      mockPrisma.expense.findFirst.mockResolvedValue(expense);

      await expect(service.delete('exp-1', USER_A)).rejects.toThrow(ForbiddenException);
    });
  });
});
