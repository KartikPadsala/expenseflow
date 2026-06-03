import { SplitMethod } from '../types';

export interface SplitInput {
  totalAmount: number;
  participantIds: string[];
  method: SplitMethod;
  // For UNEQUAL / EXACT: custom amounts per participant
  customAmounts?: Record<string, number>;
  // For PERCENTAGE: percentages per participant
  percentages?: Record<string, number>;
  // For SHARES: shares per participant
  shares?: Record<string, number>;
}

export interface SplitResult {
  participantId: string;
  owedAmount: number;
  sharePercent?: number;
  shares?: number;
}

export function calculateSplit(input: SplitInput): SplitResult[] {
  const { totalAmount, participantIds, method } = input;
  const n = participantIds.length;

  switch (method) {
    case 'EQUAL': {
      const equalShare = roundCurrency(totalAmount / n);
      const results = participantIds.map((id) => ({
        participantId: id,
        owedAmount: equalShare,
        sharePercent: roundCurrency(100 / n),
      }));
      // Fix rounding: last person gets remainder
      const sum = results.reduce((s, r) => s + r.owedAmount, 0);
      results[n - 1].owedAmount = roundCurrency(totalAmount - sum + results[n - 1].owedAmount);
      return results;
    }

    case 'UNEQUAL':
    case 'EXACT': {
      const amounts = input.customAmounts ?? {};
      return participantIds.map((id) => ({
        participantId: id,
        owedAmount: roundCurrency(amounts[id] ?? 0),
        sharePercent: totalAmount > 0 ? roundCurrency(((amounts[id] ?? 0) / totalAmount) * 100) : 0,
      }));
    }

    case 'PERCENTAGE': {
      const percentages = input.percentages ?? {};
      return participantIds.map((id) => ({
        participantId: id,
        owedAmount: roundCurrency((totalAmount * (percentages[id] ?? 0)) / 100),
        sharePercent: percentages[id] ?? 0,
      }));
    }

    case 'SHARES': {
      const sharesMap = input.shares ?? {};
      const totalShares = participantIds.reduce((s, id) => s + (sharesMap[id] ?? 1), 0);
      return participantIds.map((id) => {
        const share = sharesMap[id] ?? 1;
        return {
          participantId: id,
          owedAmount: totalShares > 0 ? roundCurrency((totalAmount * share) / totalShares) : 0,
          sharePercent: totalShares > 0 ? roundCurrency((share / totalShares) * 100) : 0,
          shares: share,
        };
      });
    }

    case 'MULTI_PAYER': {
      const amounts = input.customAmounts ?? {};
      return participantIds.map((id) => ({
        participantId: id,
        owedAmount: roundCurrency(amounts[id] ?? 0),
        sharePercent: totalAmount > 0 ? roundCurrency(((amounts[id] ?? 0) / totalAmount) * 100) : 0,
      }));
    }

    default:
      throw new Error(`Unknown split method: ${method}`);
  }
}

export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function validateSplit(results: SplitResult[], totalAmount: number): boolean {
  const sum = results.reduce((s, r) => s + r.owedAmount, 0);
  return Math.abs(sum - totalAmount) < 0.02; // allow 2 cents rounding error
}
