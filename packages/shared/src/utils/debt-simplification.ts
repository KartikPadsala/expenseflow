import { DebtTransaction, Balance } from '../types';

/**
 * Simplifies a list of debt transactions using the net-balance greedy algorithm.
 *
 * Algorithm:
 * 1. Compute net balance per person (positive = creditor, negative = debtor)
 * 2. Separate into creditors and debtors
 * 3. Greedily match the largest debtor with the largest creditor
 * 4. Return the minimal set of transactions to settle all debts
 */
export function simplifyDebts(transactions: DebtTransaction[]): DebtTransaction[] {
  // Step 1: Compute net balances
  const balanceMap = new Map<string, number>();

  for (const tx of transactions) {
    balanceMap.set(tx.from, (balanceMap.get(tx.from) ?? 0) - tx.amount);
    balanceMap.set(tx.to, (balanceMap.get(tx.to) ?? 0) + tx.amount);
  }

  // Step 2: Separate creditors (positive) and debtors (negative)
  // Sort descending for deterministic output regardless of Map insertion order
  const creditors: Balance[] = [];
  const debtors: Balance[] = [];

  for (const [userId, amount] of balanceMap.entries()) {
    if (amount > 0.01) {
      creditors.push({ userId, amount });
    } else if (amount < -0.01) {
      debtors.push({ userId, amount: -amount }); // store as positive
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Step 3: Greedy matching
  const result: DebtTransaction[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0.01) {
      result.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) ci++;
    if (debtor.amount < 0.01) di++;
  }

  return result;
}

/**
 * Calculate the balances for members within a group.
 */
export function calculateGroupBalances(
  transactions: DebtTransaction[],
): Map<string, number> {
  const balanceMap = new Map<string, number>();

  for (const tx of transactions) {
    balanceMap.set(tx.from, (balanceMap.get(tx.from) ?? 0) - tx.amount);
    balanceMap.set(tx.to, (balanceMap.get(tx.to) ?? 0) + tx.amount);
  }

  return balanceMap;
}
