import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { useSettingsStore } from '../store/settings.store';
import api from '../lib/api';

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
}

export function useExchangeRates(base?: string) {
  const { user } = useAuthStore();
  const { currency: storeCurrency } = useSettingsStore();
  const baseCurrency = base ?? user?.defaultCurrency ?? storeCurrency ?? 'USD';

  return useQuery<ExchangeRates>({
    queryKey: ['exchange-rates', baseCurrency],
    queryFn: async () => {
      const { data } = await api.get('/exchange-rates', { params: { base: baseCurrency } });
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24,
  });
}

/**
 * Convert an amount client-side using fetched rates.
 * Returns null if rates not yet loaded.
 */
export function convertClientSide(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number> | undefined,
): number | null {
  if (!rates || from === to) return from === to ? amount : null;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;
  // rates are relative to base. Convert: amount * (toRate / fromRate)
  return Math.round((amount * toRate / fromRate) * 100) / 100;
}
