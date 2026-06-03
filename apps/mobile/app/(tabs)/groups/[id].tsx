import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useGroup, useGroupBalances } from '../../../hooks/use-groups';
import { useExpenses } from '../../../hooks/use-expenses';
import { useAuthStore } from '../../../store/auth.store';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Math.abs(amount));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const group = useGroup(id);
  const balances = useGroupBalances(id);
  const expenses = useExpenses({ groupId: id, limit: 20 });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['groups', id] }),
      qc.invalidateQueries({ queryKey: ['groups', id, 'balances'] }),
      qc.invalidateQueries({ queryKey: ['expenses', { groupId: id }] }),
    ]);
    setRefreshing(false);
  }, [qc, id]);

  if (group.isLoading) return <LoadingState fullScreen />;
  if (group.isError || !group.data) {
    return <ErrorState message="Could not load group" onRetry={group.refetch} />;
  }

  const g = group.data;
  const currency = g.currency ?? 'USD';
  const simplified = balances.data?.simplified ?? [];
  const allBalances = balances.data?.balances ?? [];
  const groupExpenses = expenses.data?.data ?? [];

  const myBalance = allBalances.find((b: any) => b.userId === user?.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{g.name}</Text>
          {g.type && <Text style={styles.headerSubtitle}>{g.type.charAt(0) + g.type.slice(1).toLowerCase()}</Text>}
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Your balance */}
        {myBalance && (
          <Card style={[styles.balanceCard, myBalance.amount >= 0 ? styles.balancePositive : styles.balanceNegative]}>
            {myBalance.amount >= 0 ? <TrendingUp size={22} color="#16a34a" /> : <TrendingDown size={22} color="#dc2626" />}
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>
                {myBalance.amount >= 0 ? 'You are owed' : 'You owe'}
              </Text>
              <Text style={[styles.balanceAmount, myBalance.amount >= 0 ? styles.amtGreen : styles.amtRed]}>
                {formatCurrency(myBalance.amount, currency)}
              </Text>
            </View>
          </Card>
        )}

        {/* Simplified debts */}
        {simplified.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settle Up</Text>
            {simplified.map((s: any, i: number) => (
              <Card key={i} style={styles.settleCard}>
                <View style={styles.settleRow}>
                  <Avatar name={s.from?.displayName} size="sm" />
                  <View style={styles.settleArrow}>
                    <Text style={styles.settleArrowText}>→ owes →</Text>
                  </View>
                  <Avatar name={s.to?.displayName} size="sm" />
                  <View style={styles.settleAmountWrapper}>
                    <Text style={styles.settleAmount}>{formatCurrency(s.amount, currency)}</Text>
                  </View>
                </View>
                <Text style={styles.settleNames}>
                  {s.from?.displayName} → {s.to?.displayName}
                </Text>
              </Card>
            ))}
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Members ({g.members?.length ?? 0})
          </Text>
          {(g.members ?? []).map((m: any) => {
            const bal = allBalances.find((b: any) => b.userId === m.user?.id);
            return (
              <Card key={m.id} style={styles.memberCard}>
                <View style={styles.memberRow}>
                  <Avatar name={m.user?.displayName} uri={m.user?.avatarUrl} size="sm" />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.user?.displayName ?? 'Unknown'}</Text>
                    <Text style={styles.memberRole}>{m.role}</Text>
                  </View>
                  {bal && bal.amount !== 0 && (
                    <Badge variant={bal.amount > 0 ? 'success' : 'danger'}>
                      {bal.amount > 0 ? '+' : ''}{formatCurrency(bal.amount, currency)}
                    </Badge>
                  )}
                </View>
              </Card>
            );
          })}
        </View>

        {/* Expenses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expenses ({expenses.data?.total ?? 0})</Text>
          </View>
          {groupExpenses.length === 0 ? (
            <EmptyState emoji="💳" title="No expenses yet" message="Add the first expense to this group" />
          ) : (
            groupExpenses.map((expense: any) => (
              <TouchableOpacity
                key={expense.id}
                onPress={() => router.push(`/(tabs)/expenses/${expense.id}`)}
                activeOpacity={0.8}
              >
                <Card style={styles.expenseCard}>
                  <View style={styles.expenseRow}>
                    <View style={[styles.categoryIcon, { backgroundColor: (expense.category?.color ?? '#6b7280') + '22' }]}>
                      <Text style={styles.categoryEmoji}>{expense.category?.icon ?? '💳'}</Text>
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseDesc} numberOfLines={1}>{expense.description}</Text>
                      <Text style={styles.expenseMeta}>
                        {formatDate(expense.date)} · {expense.paidBy?.displayName ?? 'Unknown'}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  balanceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginBottom: 16 },
  balancePositive: { backgroundColor: '#f0fdf4' },
  balanceNegative: { backgroundColor: '#fff5f5' },
  balanceInfo: {},
  balanceLabel: { fontSize: 13, color: '#6b7280' },
  balanceAmount: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  amtGreen: { color: '#16a34a' },
  amtRed: { color: '#dc2626' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  settleCard: { marginBottom: 8, padding: 12 },
  settleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settleArrow: { flex: 1, alignItems: 'center' },
  settleArrowText: { fontSize: 12, color: '#9ca3af' },
  settleAmountWrapper: { marginLeft: 'auto' },
  settleAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  settleNames: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  memberCard: { marginBottom: 8, padding: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  memberRole: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  expenseCard: { marginBottom: 8 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoryEmoji: { fontSize: 20 },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 14, fontWeight: '600', color: '#111827' },
  expenseMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
});
