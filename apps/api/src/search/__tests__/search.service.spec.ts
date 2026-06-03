import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../search.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    expense: { findMany: jest.fn() },
    group: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('globalSearch', () => {
    it('returns empty results for short queries', async () => {
      const result = await service.globalSearch('user-1', 'a');
      expect(result).toEqual({ expenses: [], groups: [], users: [] });
      expect(mockPrisma.expense.findMany).not.toHaveBeenCalled();
    });

    it('returns empty results for empty query', async () => {
      const result = await service.globalSearch('user-1', '');
      expect(result).toEqual({ expenses: [], groups: [], users: [] });
    });

    it('queries all three entities in parallel', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([{ id: 'exp-1', description: 'Dinner' }]);
      mockPrisma.group.findMany.mockResolvedValue([{ id: 'grp-1', name: 'Friends' }]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'usr-2', displayName: 'Alice' }]);

      const result = await service.globalSearch('user-1', 'din');

      expect(result.expenses).toHaveLength(1);
      expect(result.groups).toHaveLength(1);
      expect(result.users).toHaveLength(1);
      expect(result.query).toBe('din');
    });

    it('searches expenses with notes OR description', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.group.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.globalSearch('user-1', 'coffee');

      const call = mockPrisma.expense.findMany.mock.calls[0][0];
      // Should have AND with OR for access control AND OR for text search
      expect(call.where.AND).toBeDefined();
      const textOr = call.where.AND[1].OR;
      expect(textOr).toEqual(expect.arrayContaining([
        { description: { contains: 'coffee', mode: 'insensitive' } },
        { notes: { contains: 'coffee', mode: 'insensitive' } },
      ]));
    });

    it('respects custom limit', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.group.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.globalSearch('user-1', 'food', 5);

      expect(mockPrisma.expense.findMany.mock.calls[0][0].take).toBe(5);
      expect(mockPrisma.group.findMany.mock.calls[0][0].take).toBe(5);
      expect(mockPrisma.user.findMany.mock.calls[0][0].take).toBe(5);
    });

    it('trims whitespace from query', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.group.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.globalSearch('user-1', '  pizza  ');

      expect(mockPrisma.expense.findMany.mock.calls[0][0].where.AND[1].OR[0]).toEqual({
        description: { contains: 'pizza', mode: 'insensitive' },
      });
    });
  });
});
