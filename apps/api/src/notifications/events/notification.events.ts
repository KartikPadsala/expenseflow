export class ExpenseCreatedEvent {
  constructor(
    public readonly expenseId: string,
    public readonly groupId: string | null,
    public readonly description: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly paidById: string,
    public readonly participantIds: string[],
    public readonly createdById: string,
  ) {}
}

export class ExpenseUpdatedEvent {
  constructor(
    public readonly expenseId: string,
    public readonly groupId: string | null,
    public readonly description: string,
    public readonly updatedById: string,
    public readonly participantIds: string[],
  ) {}
}

export class ExpenseDeletedEvent {
  constructor(
    public readonly expenseId: string,
    public readonly description: string,
    public readonly deletedById: string,
    public readonly participantIds: string[],
  ) {}
}

export class GroupInviteEvent {
  constructor(
    public readonly groupId: string,
    public readonly groupName: string,
    public readonly invitedUserId: string,
    public readonly invitedByName: string,
  ) {}
}

export class SettlementRequestedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly payerId: string,
    public readonly payerName: string,
    public readonly payeeId: string,
  ) {}
}

export class SettlementCompletedEvent {
  constructor(
    public readonly settlementId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly payerId: string,
    public readonly payeeId: string,
    public readonly payeeName: string,
  ) {}
}

export const NotificationEvents = {
  EXPENSE_CREATED: 'expense.created',
  EXPENSE_UPDATED: 'expense.updated',
  EXPENSE_DELETED: 'expense.deleted',
  GROUP_INVITE: 'group.invite',
  SETTLEMENT_REQUESTED: 'settlement.requested',
  SETTLEMENT_COMPLETED: 'settlement.completed',
} as const;
