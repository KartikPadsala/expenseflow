import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, TrendingDown, TrendingUp, HandCoins, Settings, Users } from 'lucide-react-native';
import { useGroup, useGroupBalances } from '../../../hooks/use-groups';
import { useExpenses } from '../../../hooks/use-expenses';
import { useAuthStore } from '../../../store/auth.store';
import { useBulkSettle, useSettlements } from '../../../hooks/use-settlements';
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
  const bulkSettle = useBulkSettle();
  const groupSettlements = useSettlements({ groupId: id, status: 'COMPLETED' });

  const [refreshing, setRefreshing] = React.useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);

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
  const completedSettlements = groupSettlements.data ?? [];

  const myBalance = allBalances.find((b: any) => b.userId === user?.id);
  const myDebts = simplified.filter((s: any) => s.from === user?.id);
  const myDebtTotal = myDebts.reduce((sum: number, s: any) => sum + s.amount, 0);

  function handleSettleAll() {
    bulkSettle.mutate(
      {
        groupId: id,
        settlements: myDebts.map((s: any) => ({ payeeId: s.to, amount: s.amount, currency })),
      },
      {
        onSuccess: () => { setSettleModalOpen(false); Alert.alert('Success', 'All settlements recorded!'); },
        onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to settle'),
      },
    );
  }

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
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.push('/groups/edit/' + id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Settings size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settleUpBtn}
          onPress={() => router.push({ pathname: '/settlements/new', params: { groupId: id, currency } })}
        >
          <HandCoins size={16} color="#6366f1" />
          <Text style={styles.settleUpText}>Settle Up</Text>
        </TouchableOpacity>
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Settle Up</Text>
              {myDebts.length > 0 && (
                <TouchableOpacity style={styles.settleAllBtn} onPress={() => setSettleModalOpen(true)}>
                  <HandCoins size={14} color="#6366f1" />
                  <Text style={styles.settleAllText}>Settle All ({formatCurrency(myDebtTotal, currency)})</Text>
                </TouchableOpacity>
              )}
            </View>
            {simplified.map((s: any, i: number) => (
              <Card key={i} style={styles.settleCard}>
                <View style={styles.settleRow}>
                  <Avatar name={s.fromUser?.displayName ?? s.from} size="sm" />
                  <View style={styles.settleArrow}>
                    <Text style={styles.settleArrowText}>→ owes →</Text>
                  </View>
                  <Avatar name={s.toUser?.displayName ?? s.to} size="sm" />
                  <View style={styles.settleAmountWrapper}>
                    <Text style={styles.settleAmount}>{formatCurrency(s.amount, currency)}</Text>
                  </View>
                </View>
                <View style={styles.settleBottom}>
                  <Text style={styles.settleNames}>
                    {s.fromUser?.displayName ?? s.from} → {s.toUser?.displayName ?? s.to}
                  </Text>
                  <TouchableOpacity
                    style={styles.settleBtn}
                    onPress={() => router.push({
                      pathname: '/settlements/new',
                      params: {
                        payeeId: s.to,
                        amount: s.amount.toString(),
                        groupId: id,
                        currency,
                      },
                    })}
                  >
                    <Text style={styles.settleBtnText}>Settle</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members ({g.members?.length ?? 0})</Text>
            <TouchableOpacity onPress={() => router.push('/groups/members/' + id)}>
              <Text style={styles.manageLink}>Manage <Users size={12} color="#6366f1" /></Text>
            </TouchableOpacity>
          </View>
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

        {/* Settlement History */}
        {completedSettlements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Settlement History ({completedSettlements.length})</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/settlements', params: {} })}>
                <Text style={styles.manageLink}>See all</Text>
              </TouchableOpacity>
            </View>
            {completedSettlements.slice(0, 5).map((s: any) => {
              const isPayer = s.payerId === user?.id;
              return (
                <TouchableOpacity key={s.id} onPress={() => router.push(`/settlements/${s.id}`)}>
                  <Card style={styles.settlementHistoryCard}>
                    <View style={styles.settlementHistoryRow}>
                      <View style={[styles.directionDot, isPayer ? styles.dotRed : styles.dotGreen]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.settlementHistoryTitle}>
                          {isPayer
                            ? `You paid ${s.payee?.displayName ?? 'someone'}`
                            : `${s.payer?.displayName ?? 'Someone'} paid you`}
                        </Text>
                        <Text style={styles.settlementHistoryDate}>
                          {s.settledAt
                            ? new Date(s.settledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : ''}
                        </Text>
                      </View>
                      <Text style={[styles.settlementHistoryAmt, isPayer ? styles.amtRed : styles.amtGreen]}>
                        {formatCurrency(s.amount, s.currency ?? currency)}
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Settle All Modal */}
      <Modal visible={settleModalOpen} transparent animationType="slide" onRequestClose={() => setSettleModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Settle All Your Debts</Text>
            <Text style={styles.modalSubtitle}>
              Record {myDebts.length} settlement{myDebts.length > 1 ? 's' : ''} totalling{' '}
              {formatCurrency(myDebtTotal, currency)}
            </Text>
            {myDebts.map((s: any, i: number) => (
              <View key={i} style={styles.debtRow}>
                <Text style={styles.debtText}>You → {s.toUser?.displayName ?? s.to}</Text>
                <Text style={styles.debtAmt}>{formatCurrency(s.amount, currency)}</Text>
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSettleModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSettleAll} disabled={bulkSettle.isPending}>
                {bulkSettle.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmBtnText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  settleBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  settleNames: { fontSize: 11, color: '#9ca3af' },
  settleUpBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#6366f1' },
  settleUpText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  settleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#ede9fe' },
  settleBtnText: { fontSize: 12, fontWeight: '600', color: '#6366f1' },
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
  headerIconBtn: { padding: 4 },
  settleAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settleAllText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  manageLink: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  settlementHistoryCard: { marginBottom: 6, padding: 12 },
  settlementHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  directionDot: { width: 10, height: 10, borderRadius: 5 },
  dotRed: { backgroundColor: '#dc2626' },
  dotGreen: { backgroundColor: '#16a34a' },
  settlementHistoryTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  settlementHistoryDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  settlementHistoryAmt: { fontSize: 14, fontWeight: '700' },
  amtRed: { color: '#dc2626' },
  amtGreen: { color: '#16a34a' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  debtRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  debtText: { fontSize: 14, color: '#374151' },
  debtAmt: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: '#6366f1', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
});
