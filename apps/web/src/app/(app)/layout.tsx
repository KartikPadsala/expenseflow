'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth.store';

export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.push('/auth/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated()) return null;

  return <AppLayout>{children}</AppLayout>;
}
