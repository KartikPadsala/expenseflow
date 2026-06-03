import { PushDeliveryProcessor } from '../push-delivery.processor';

jest.mock('expo-server-sdk', () => {
  const MockExpo = jest.fn().mockImplementation(() => ({
    chunkPushNotifications: jest.fn((msgs: any[]) => [msgs]),
    sendPushNotificationsAsync: jest.fn().mockResolvedValue([{ status: 'ok' }]),
  }));
  (MockExpo as any).isExpoPushToken = jest.fn((t: string) => t.startsWith('ExponentPushToken['));
  return MockExpo;
});

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('PushDeliveryProcessor', () => {
  let processor: PushDeliveryProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new PushDeliveryProcessor(mockPrisma as any);
  });

  it('skips sending when no valid tokens', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', pushTokens: [] }]);
    const job = { data: { userIds: ['u1'], title: 'Test', body: 'Body', data: {} } } as any;
    await expect(processor.handleSend(job)).resolves.not.toThrow();
  });

  it('skips invalid token formats', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', pushTokens: ['not-a-valid-token', 'ExponentPushToken[valid]'] },
    ]);
    const job = { data: { userIds: ['u1'], title: 'T', body: 'B', data: {} } } as any;
    await expect(processor.handleSend(job)).resolves.not.toThrow();
  });

  it('removes DeviceNotRegistered tokens', async () => {
    const Expo = require('expo-server-sdk');
    const instance = new Expo();
    instance.sendPushNotificationsAsync.mockResolvedValue([
      { status: 'error', message: 'Not registered', details: { error: 'DeviceNotRegistered' } },
    ]);

    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', pushTokens: ['ExponentPushToken[stale]'] },
    ]);
    mockPrisma.user.findUnique.mockResolvedValue({ pushTokens: ['ExponentPushToken[stale]'] });

    const job = { data: { userIds: ['u1'], title: 'T', body: 'B', data: {} } } as any;
    await expect(processor.handleSend(job)).resolves.not.toThrow();
  });
});
