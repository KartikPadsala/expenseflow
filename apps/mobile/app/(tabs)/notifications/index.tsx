import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Check, Trash2, Receipt, Users, HandCoins, UserPlus } from 'lucide-react-native';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type AppNotification,
} from '../../../hooks/use-notifications';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  EXPENSE_ADDED:        { icon: Receipt,   color: '#6366f1', bg: '#eef2ff' },
  EXPENSE_EDITED:       { icon: Receipt,   color: '#f59e0b', bg: '#fffbeb' },
  EXPENSE_DELETED:      { icon: Receipt,   color: '#ef4444', bg: '#fef2f2' },
  GROUP_INVITE:         { icon: Users,     color: '#8b5cf6', bg: '#f5f3ff' },
  GROUP_JOINED:         { icon: Users,     color: '#10b981', bg: '#ecfdf5' },
  SETTLEMENT_REQUEST:   { icon: HandCoins, color: '#f97316', bg: '#fff7ed' },
  SETTLEMENT_COMPLETED: { icon: HandCoins, color: '#16a34a', bg: '#f0fdf4' },
  FRIEND_REQUEST:       { icon: UserPlus,  color: '#06b6d4', bg: '#ecfeff' },
  FRIEND_ACCEPTED:      { icon: UserPlus,  color: '#0284c7', bg: '#eff6ff' },
  REMINDER:             { icon: Bell,      color: '#6b7280', bg: '#f9fafb' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const notifications = data?.data ?? [];
  const unreadCount = data?.unread ?? 0;

  function handlePress(notif: AppNotification) {
    if (!notif.isRead) markRead.mutate(notif.id);

    const d = notif.data as Record<string, string> | null | undefined;
    if (!d) return;
    if (d.screen === 'expense' && d.expenseId) router.push(`/expenses/${d.expenseId}` as any);
    else if (d.screen === 'group' && d.groupId) router.push(`/groups/${d.groupId}` as any);
    else if (d.screen === 'settlement' && d.settlementId) router.push(`/settlements/${d.settlementId}` as any);
  }

  function handleDelete(notif: AppNotification) {
    Alert.alert('Delete notification?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNotif.mutate(notif.id) },
    ]);
  }

  if (isLoading) return <LoadingState fullScreen />;
  if (isError) return <ErrorState message="Could not load notifications" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <Check size={16} color="#6366f1" />
              <Text style={styles.markAllText}>All read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="You're all caught up! Notifications about expenses, settlements, and groups will appear here."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.REMINDER;
            const Icon = config.icon;
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.item, !notif.isRead && styles.itemUnread]}
                onPress={() => handlePress(notif)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
                  <Icon size={20} color={config.color} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, !notif.isRead && styles.itemTitleBold]}>
                    {notif.title}
                  </Text>
                  <Text style={styles.itemBody} numberOfLines={2}>{notif.body}</Text>
                  <Text style={styles.itemTime}>{timeAgo(notif.createdAt)}</Text>
                </View>
                <View style={styles.itemActions}>
                  {!notif.isRead && <View style={styles.unreadDot} />}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(notif)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={14} color="#d1d5db" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}

          {(data?.total ?? 0) > (data?.data?.length ?? 0) && (
            <Text style={styles.loadMore}>Showing {data?.data?.length} of {data?.total}</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadBadge: {
    backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: '#e0e7ff', backgroundColor: '#eef2ff',
  },
  markAllText: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
  list: { paddingVertical: 8 },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  itemUnread: { backgroundColor: '#fafbff' },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  itemContent: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 14, color: '#111827' },
  itemTitleBold: { fontWeight: '600' },
  itemBody: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  itemTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  itemActions: { alignItems: 'center', gap: 8, paddingTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' },
  deleteBtn: { padding: 4 },
  loadMore: { textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 16 },
});
