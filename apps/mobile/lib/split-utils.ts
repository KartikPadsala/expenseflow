/**
 * Mobile-side split calculation utilities.
 * Mirrors packages/shared/src/utils/expense-calculations.ts without the package dependency
 * (to avoid bundling Node.js-specific code into mobile bundle).
 */

export type SplitMethod = 'EQUAL' | 'UNEQUAL' | 'PERCENTAGE' | 'SHARES' | 'EXACT' | 'MULTI_PAYER';

export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export interface ParticipantShare {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  owedAmount: number;
  sharePercent: number;
  shares?: number;
}

export function calculateEqualSplit(
  totalAmount: number,
  participants: { userId: string; displayName: string; avatarUrl?: string | null }[],
): ParticipantShare[] {
  const n = participants.length;
  if (n === 0) return [];
  const equalShare = roundCurrency(totalAmount / n);
  const results = participants.map((p) => ({
    userId: p.userId,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    owedAmount: equalShare,
    sharePercent: roundCurrency(100 / n),
  }));
  const sum = results.reduce((s, r) => s + r.owedAmount, 0);
  results[n - 1].owedAmount = roundCurrency(totalAmount - sum + results[n - 1].owedAmount);
  return results;
}

export function calculatePercentageSplit(
  totalAmount: number,
  participants: { userId: string; displayName: string; avatarUrl?: string | null }[],
  percentages: Record<string, number>,
): ParticipantShare[] {
  return participants.map((p) => ({
    userId: p.userId,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    owedAmount: roundCurrency((totalAmount * (percentages[p.userId] ?? 0)) / 100),
    sharePercent: percentages[p.userId] ?? 0,
  }));
}

export function calculateSharesSplit(
  totalAmount: number,
  participants: { userId: string; displayName: string; avatarUrl?: string | null }[],
  shares: Record<string, number>,
): ParticipantShare[] {
  const totalShares = participants.reduce((s, p) => s + (shares[p.userId] ?? 1), 0);
  return participants.map((p) => {
    const share = shares[p.userId] ?? 1;
    return {
      userId: p.userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      owedAmount: totalShares > 0 ? roundCurrency((totalAmount * share) / totalShares) : 0,
      sharePercent: totalShares > 0 ? roundCurrency((share / totalShares) * 100) : 0,
      shares: share,
    };
  });
}

export function calculateUnequalSplit(
  totalAmount: number,
  participants: { userId: string; displayName: string; avatarUrl?: string | null }[],
  customAmounts: Record<string, number>,
): ParticipantShare[] {
  return participants.map((p) => {
    const amt = customAmounts[p.userId] ?? 0;
    return {
      userId: p.userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      owedAmount: roundCurrency(amt),
      sharePercent: totalAmount > 0 ? roundCurrency((amt / totalAmount) * 100) : 0,
    };
  });
}

export function getSplitAmounts(
  totalAmount: number,
  participants: { userId: string; displayName: string; avatarUrl?: string | null }[],
  method: SplitMethod,
  customAmounts: Record<string, number>,
  percentages: Record<string, number>,
  shares: Record<string, number>,
): ParticipantShare[] {
  switch (method) {
    case 'EQUAL':
      return calculateEqualSplit(totalAmount, participants);
    case 'PERCENTAGE':
      return calculatePercentageSplit(totalAmount, participants, percentages);
    case 'SHARES':
      return calculateSharesSplit(totalAmount, participants, shares);
    case 'UNEQUAL':
    case 'EXACT':
    case 'MULTI_PAYER':
      return calculateUnequalSplit(totalAmount, participants, customAmounts);
    default:
      return calculateEqualSplit(totalAmount, participants);
  }
}

export function validatePercentagesSum(percentages: Record<string, number>): boolean {
  const sum = Object.values(percentages).reduce((s, v) => s + v, 0);
  return Math.abs(sum - 100) < 0.5;
}

export function validateAmountsSum(amounts: Record<string, number>, total: number): boolean {
  const sum = Object.values(amounts).reduce((s, v) => s + v, 0);
  return Math.abs(sum - total) < 0.02;
}

export function getMethodLabel(method: SplitMethod): string {
  const labels: Record<SplitMethod, string> = {
    EQUAL: 'Equal Split',
    UNEQUAL: 'Unequal Amounts',
    PERCENTAGE: 'By Percentage',
    SHARES: 'By Shares',
    EXACT: 'Exact Amounts',
    MULTI_PAYER: 'Multiple Payers',
  };
  return labels[method] ?? method;
}

export function getMethodDescription(method: SplitMethod): string {
  const descs: Record<SplitMethod, string> = {
    EQUAL: 'Divide equally among all participants',
    UNEQUAL: 'Set custom amounts for each person',
    PERCENTAGE: 'Split by percentage (must total 100%)',
    SHARES: 'Assign share weights (e.g. 2:1:1)',
    EXACT: 'Enter the exact amount each person owes',
    MULTI_PAYER: 'Multiple people paid; enter each contribution',
  };
  return descs[method] ?? '';
}
