'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30000 } } });
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider attribute="class" defaultTheme="light">{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
