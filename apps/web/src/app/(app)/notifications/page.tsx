'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bell, BellOff, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type AppNotification,
} from '@/hooks/use-notifications';

const TYPE_LABELS: Record<string, string> = {
  EXPENSE_ADDED: 'New Expense',
  EXPENSE_UPDATED: 'Expense Updated',
  EXPENSE_DELETED: 'Expense Deleted',
  GROUP_INVITE: 'Group Invitation',
  SETTLEMENT_REQUESTED: 'Settlement Requested',
  SETTLEMENT_COMPLETED: 'Settlement Completed',
  PAYMENT_RECEIVED: 'Payment Received',
  REMINDER: 'Reminder',
};

const TYPE_COLORS: Record<string, string> = {
  EXPENSE_ADDED: 'bg-blue-100 text-blue-700',
  EXPENSE_UPDATED: 'bg-yellow-100 text-yellow-700',
  EXPENSE_DELETED: 'bg-red-100 text-red-700',
  GROUP_INVITE: 'bg-purple-100 text-purple-700',
  SETTLEMENT_REQUESTED: 'bg-orange-100 text-orange-700',
  SETTLEMENT_COMPLETED: 'bg-green-100 text-green-700',
  PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-700',
  REMINDER: 'bg-gray-100 text-gray-700',
};

function getNotificationHref(n: AppNotification): string | null {
  const d = n.data;
  if (!d) return null;
  if (d.expenseId) return `/expenses/${d.expenseId}`;
  if (d.groupId) return `/groups/${d.groupId}`;
  if (d.settlementId) return `/settlements/${d.settlementId}`;
  return null;
}

function NotificationItem({ n }: { n: AppNotification }) {
  const markRead = useMarkNotificationRead();
  const deleteNotif = useDeleteNotification();
  const href = getNotificationHref(n);
  const label = TYPE_LABELS[n.type] ?? n.type;
  const colorClass = TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-700';

  const handleRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!n.isRead) markRead.mutate(n.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotif.mutate(n.id);
  };

  const content = (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
        !n.isRead ? 'bg-blue-50/40 border-blue-100' : 'bg-background border-border'
      }`}
    >
      <div className="mt-0.5">
        {!n.isRead ? (
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
        ) : (
          <div className="w-2 h-2" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
            {label}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="font-medium text-sm leading-snug">{n.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {!n.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRead}
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={handleDelete}
          title="Delete notification"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline" onClick={() => !n.isRead && markRead.mutate(n.id)}>
        {content}
      </Link>
    );
  }

  return content;
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page);
  const markAll = useMarkAllNotificationsRead();

  const totalPages = data ? Math.ceil(data.total / (data.limit || 20)) : 1;

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {(data?.unread ?? 0) > 0 && (
            <Badge variant="secondary">{data!.unread} unread</Badge>
          )}
        </div>
        {(data?.unread ?? 0) > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && (!data?.data || data.data.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No notifications yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            You'll see updates about expenses, groups, and settlements here.
          </p>
        </div>
      )}

      {data && data.data.length > 0 && (
        <div className="space-y-2">
          {data.data.map((n) => (
            <NotificationItem key={n.id} n={n} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
