export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

/**
 * Given a base date and frequency, compute the next occurrence date.
 * Returns a new Date object (does not mutate input).
 */
export function computeNextDate(current: Date, frequency: RecurringFrequency): Date {
  const next = new Date(current);

  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY': {
      const targetDay = next.getDate();
      next.setMonth(next.getMonth() + 1, 1);
      const daysInNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(targetDay, daysInNextMonth));
      break;
    }
    case 'QUARTERLY': {
      const qTargetDay = next.getDate();
      next.setMonth(next.getMonth() + 3, 1);
      const daysInQMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(qTargetDay, daysInQMonth));
      break;
    }
    case 'YEARLY': {
      const yYear = next.getFullYear() + 1;
      const yMonth = next.getMonth();
      const yDay = next.getDate();
      if (yMonth === 1 && yDay === 29) {
        const isLeap = (yYear % 4 === 0 && yYear % 100 !== 0) || yYear % 400 === 0;
        next.setFullYear(yYear, yMonth, isLeap ? 29 : 28);
      } else {
        next.setFullYear(yYear);
      }
      break;
    }
  }

  return next;
}

/**
 * Returns true if the recurring expense is due on or before today.
 */
export function isDue(nextDueDate: Date, endDate?: Date | null): boolean {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  if (nextDueDate > now) return false;
  if (endDate && new Date() > endDate) return false;
  return true;
}

/**
 * Returns true if a recurring expense has passed its end date.
 */
export function isExpired(endDate?: Date | null): boolean {
  if (!endDate) return false;
  return new Date() > endDate;
}
