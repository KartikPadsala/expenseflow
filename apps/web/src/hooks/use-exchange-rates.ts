import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

export function useExchangeRates(base?: string) {
  const { user } = useAuthStore();
  const baseCurrency = base ?? (user as any)?.defaultCurrency ?? 'USD';

  return useQuery<{ base: string; rates: Record<string, number> }>({
    queryKey: ['exchange-rates', baseCurrency],
    queryFn: async () => {
      const { data } = await api.get('/exchange-rates', { params: { base: baseCurrency } });
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });
}
