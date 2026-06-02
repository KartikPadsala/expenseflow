export type UserRole = 'USER' | 'ADMIN';
export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';
export type GroupType = 'HOME' | 'TRIP' | 'COUPLE' | 'OFFICE' | 'OTHER';
export type GroupMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type SplitMethod = 'EQUAL' | 'UNEQUAL' | 'PERCENTAGE' | 'SHARES' | 'EXACT' | 'MULTI_PAYER';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE' | 'WISE' | 'INTERAC' | 'OTHER';
export type SettlementStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  defaultCurrency: string;
  language: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  type: GroupType;
  currency: string;
  isArchived: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  members?: GroupMember[];
  _count?: { expenses: number; members: number };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  joinedAt: Date;
  user?: User;
}

export interface Expense {
  id: string;
  groupId?: string | null;
  description: string;
  amount: number;
  currency: string;
  convertedAmount?: number | null;
  baseCurrency?: string | null;
  exchangeRate?: number | null;
  date: Date;
  categoryId?: string | null;
  paidById: string;
  splitMethod: SplitMethod;
  notes?: string | null;
  isDeleted: boolean;
  isRecurring: boolean;
  recurringId?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  paidBy?: User;
  participants?: ExpenseParticipant[];
  items?: ExpenseItem[];
  attachments?: Attachment[];
  category?: Category;
}

export interface ExpenseParticipant {
  id: string;
  expenseId: string;
  userId: string;
  owedAmount: number;
  paidAmount: number;
  isSettled: boolean;
  sharePercent?: number | null;
  shares?: number | null;
  user?: User;
}

export interface ExpenseItem {
  id: string;
  expenseId: string;
  description: string;
  amount: number;
  quantity: number;
  participants?: ExpenseItemParticipant[];
}

export interface ExpenseItemParticipant {
  id: string;
  itemId: string;
  userId: string;
  amount: number;
}

export interface Settlement {
  id: string;
  groupId?: string | null;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: SettlementStatus;
  notes?: string | null;
  createdAt: Date;
  settledAt?: Date | null;
  payer?: User;
  payee?: User;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  userId?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  expenseId: string;
  uploadedById: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  url?: string | null;
  createdAt: Date;
}

export interface DebtTransaction {
  from: string;
  to: string;
  amount: number;
}

export interface Balance {
  userId: string;
  amount: number; // positive = owed to you, negative = you owe
}

export interface OcrResult {
  merchant?: string;
  date?: string;
  total?: number;
  tax?: number;
  currency?: string;
  items: OcrLineItem[];
  rawText?: string;
}

export interface OcrLineItem {
  description: string;
  amount: number;
  quantity?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
