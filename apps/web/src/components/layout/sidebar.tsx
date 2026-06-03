'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Receipt, HandCoins, PieChart,
  Bell, Settings, LogOut, Wallet, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout } from '@/hooks/use-auth';
import { useUnreadCount } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/settlements', label: 'Settlements', icon: HandCoins },
  { href: '/recurring', label: 'Recurring', icon: RefreshCw },
  { href: '/analytics', label: 'Analytics', icon: PieChart },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/profile', label: 'Profile', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useLogout();
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Wallet className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">ExpenseFlow</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const isNotif = href === '/notifications';
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-1',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {isNotif && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
