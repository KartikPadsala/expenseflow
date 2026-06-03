import { NotificationsService } from '../notifications.service';
import {
  ExpenseCreatedEvent,
  ExpenseUpdatedEvent,
  ExpenseDeletedEvent,
  GroupInviteEvent,
  SettlementRequestedEvent,
  SettlementCompletedEvent,
} from '../events/notification.events';

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockPushQueue = {
  add: jest.fn().mockResolvedValue({}),
};

function makeService() {
  return new NotificationsService(mockPrisma as any, mockPushQueue as any);
}

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService();
  });

  describe('findAll', () => {
    it('returns paginated notifications with unread count', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
      mockPrisma.notification.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
      const result = await service.findAll('u1');
      expect(result.total).toBe(5);
      expect(result.unread).toBe(2);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getUnreadCount', () => {
    it('returns count of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);
      const result = await service.getUnreadCount('u1');
      expect(result).toBe(3);
    });
  });

  describe('markRead / markAllRead', () => {
    it('marks single notification read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
      await service.markRead('n1', 'u1');
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n1', userId: 'u1' },
        data: { isRead: true },
      });
    });

    it('marks all notifications read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });
      await service.markAllRead('u1');
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('createAndPush', () => {
    it('creates DB notifications and enqueues push job', async () => {
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });
      await service.createAndPush(['u1', 'u2'], 'EXPENSE_ADDED', 'Title', 'Body', { expenseId: 'e1' });
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'u1', type: 'EXPENSE_ADDED' }),
          expect.objectContaining({ userId: 'u2', type: 'EXPENSE_ADDED' }),
        ]),
      });
      expect(mockPushQueue.add).toHaveBeenCalledWith(
        'send',
        expect.objectContaining({ userIds: ['u1', 'u2'], title: 'Title' }),
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('does nothing when userIds is empty', async () => {
      await service.createAndPush([], 'EXPENSE_ADDED', 'Title', 'Body');
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
      expect(mockPushQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('registerPushToken', () => {
    it('adds token if not already present', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ pushTokens: ['ExponentPushToken[abc]'] });
      await service.registerPushToken('u1', 'ExponentPushToken[xyz]');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { pushTokens: { push: 'ExponentPushToken[xyz]' } },
      });
    });

    it('does not add duplicate token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ pushTokens: ['ExponentPushToken[abc]'] });
      await service.registerPushToken('u1', 'ExponentPushToken[abc]');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    describe('onExpenseCreated', () => {
      it('notifies participants except payer', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ displayName: 'Alice' });
        mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });
        const event = new ExpenseCreatedEvent('e1', 'g1', 'Dinner', 50, 'USD', 'u1', ['u1', 'u2', 'u3'], 'u1');
        await service.onExpenseCreated(event);
        const call = mockPrisma.notification.createMany.mock.calls[0][0];
        const userIds = call.data.map((d: any) => d.userId);
        expect(userIds).not.toContain('u1');
        expect(userIds).toContain('u2');
        expect(userIds).toContain('u3');
      });

      it('does nothing when no other participants', async () => {
        const event = new ExpenseCreatedEvent('e1', null, 'Solo', 10, 'USD', 'u1', ['u1'], 'u1');
        await service.onExpenseCreated(event);
        expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
      });

      it('does not throw on error', async () => {
        mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));
        const event = new ExpenseCreatedEvent('e1', null, 'X', 10, 'USD', 'u1', ['u1', 'u2'], 'u1');
        await expect(service.onExpenseCreated(event)).resolves.not.toThrow();
      });
    });

    describe('onGroupInvite', () => {
      it('notifies the invited user', async () => {
        mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });
        const event = new GroupInviteEvent('g1', 'Trip to Italy', 'u2', 'Alice');
        await service.onGroupInvite(event);
        const call = mockPrisma.notification.createMany.mock.calls[0][0];
        expect(call.data[0].userId).toBe('u2');
        expect(call.data[0].title).toContain('invitation');
      });
    });

    describe('onSettlementRequested', () => {
      it('notifies the payee', async () => {
        mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });
        const event = new SettlementRequestedEvent('s1', 50, 'USD', 'u1', 'Alice', 'u2');
        await service.onSettlementRequested(event);
        const call = mockPrisma.notification.createMany.mock.calls[0][0];
        expect(call.data[0].userId).toBe('u2');
        expect(call.data[0].body).toContain('Alice');
        expect(call.data[0].body).toContain('50.00');
      });
    });

    describe('onSettlementCompleted', () => {
      it('notifies the payer', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ displayName: 'Bob' });
        mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });
        const event = new SettlementCompletedEvent('s1', 50, 'USD', 'u1', 'u2', 'Bob');
        await service.onSettlementCompleted(event);
        const call = mockPrisma.notification.createMany.mock.calls[0][0];
        expect(call.data[0].userId).toBe('u1');
      });
    });
  });
});
