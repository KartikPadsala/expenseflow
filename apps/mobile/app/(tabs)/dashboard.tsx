import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Users, Receipt, UserPlus } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth.store';
import { useSpendingAnalytics } from '../../hooks/use-analytics';
import { useGroups } from '../../hooks/use-groups';
import { useFriends, useFriendRequests } from '../../hooks/use-friends';
import { useExpenses } from '../../hooks/use-expenses';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { LoadingState } from '../../components/ui/LoadingState';

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const analytics = useSpendingAnalytics('month');
  const groups = useGroups();
  const friends = useFriends();
  const friendRequests = useFriendRequests();
  const recentExpenses = useExpenses({ limit: 5, page: 1 });

  const isLoading = analytics.isLoading || groups.isLoading || recentExpenses.isLoading;

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['analytics'] }),
      qc.invalidateQueries({ queryKey: ['groups'] }),
      qc.invalidateQueries({ queryKey: ['friends'] }),
      qc.invalidateQueries({ queryKey: ['expenses'] }),
    ]);
    setRefreshing(false);
  }, [qc]);

  const pendingRequests = friendRequests.data?.length ?? 0;
  const spendingTotal = analytics.data?.total ?? 0;
  const currency = user?.defaultCurrency ?? 'USD';

  const expenses = recentExpenses.data?.data ?? [];
  const groupCount = groups.data?.length ?? 0;
  const friendCount = friends.data?.length ?? 0;
  const expenseCount = analytics.data?.expenseCount ?? 0;

  if (isLoading) {
    return <LoadingState fullScreen message="Loading your dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good {getGreeting()} 👋</Text>
            <Text style={styles.name}>{user?.displayName ?? 'there'}!</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Avatar name={user?.displayName} uri={user?.avatarUrl} size="md" />
          </TouchableOpacity>
        </View>

        {/* Spending card */}
        <Card style={styles.spendingCard}>
          <View style={styles.spendingHeader}>
            <View>
              <Text style={styles.spendingLabel}>This month</Text>
              <Text style={styles.spendingAmount}>{formatCurrency(spendingTotal, currency)}</Text>
            </View>
            <View style={styles.spendingIcon}>
              <TrendingUp size={24} color="#22c55e" />
            </View>
          </View>
          <Text style={styles.spendingSubtext}>{expenseCount} expense{expenseCount !== 1 ? 's' : ''} recorded</Text>
        </Card>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/groups')}>
            <Users size={20} color="#22c55e" />
            <Text style={styles.statValue}>{groupCount}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/expenses')}>
            <Receipt size={20} color="#3b82f6" />
            <Text style={styles.statValue}>{expenseCount}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.statCard, styles.statCardRelative]} onPress={() => router.push('/(tabs)/friends')}>
            <UserPlus size={20} color="#f59e0b" />
            <Text style={styles.statValue}>{friendCount}</Text>
            <Text style={styles.statLabel}>Friends</Text>
            {pendingRequests > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Recent expenses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {expenses.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No expenses yet. Add your first expense!</Text>
            </Card>
          ) : (
            expenses.map((expense: any) => (
              <TouchableOpacity
                key={expense.id}
                onPress={() => router.push(`/(tabs)/expenses/${expense.id}`)}
                activeOpacity={0.8}
              >
                <Card style={styles.expenseCard}>
                  <View style={styles.expenseRow}>
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: expense.category?.color ? expense.category.color + '22' : '#f3f4f6' },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>{expense.category?.icon ?? '💳'}</Text>
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseDesc} numberOfLines={1}>{expense.description}</Text>
                      <Text style={styles.expenseMeta}>
                        {formatDate(expense.date)} • Paid by {expense.paidBy?.displayName ?? 'Unknown'}
                      </Text>
                    </View>
                    <Text style={styles.expenseAmount}>
                      {formatCurrency(expense.amount, expense.currency)}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: {},
  greeting: { fontSize: 14, color: '#6b7280' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  spendingCard: { backgroundColor: '#16a34a', padding: 20, marginBottom: 16 },
  spendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  spendingLabel: { fontSize: 14, color: '#dcfce7', marginBottom: 4 },
  spendingAmount: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  spendingIcon: { backgroundColor: '#ffffff22', borderRadius: 10, padding: 8 },
  spendingSubtext: { fontSize: 13, color: '#bbf7d0', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardRelative: { position: 'relative' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#22c55e', fontWeight: '500' },
  expenseCard: { marginBottom: 8 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoryEmoji: { fontSize: 20 },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 14, fontWeight: '600', color: '#111827' },
  expenseMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: 8 },
});
