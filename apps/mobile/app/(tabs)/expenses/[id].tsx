import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Calendar, Users, FileText } from 'lucide-react-native';
import { useExpense, useDeleteExpense } from '../../../hooks/use-expenses';
import { useAuthStore } from '../../../store/auth.store';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Divider } from '../../../components/ui/Divider';

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}
function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const expense = useExpense(id);
  const { mutate: deleteExpense, isPending: deleting } = useDeleteExpense();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['expenses', id] });
    setRefreshing(false);
  }, [qc, id]);

  const handleDelete = () => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteExpense(id, {
            onSuccess: () => router.back(),
            onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Could not delete expense'),
          });
        },
      },
    ]);
  };

  if (expense.isLoading) return <LoadingState fullScreen />;
  if (expense.isError || !expense.data) {
    return <ErrorState message="Could not load expense" onRetry={expense.refetch} />;
  }

  const e = expense.data;
  const isOwner = e.paidBy?.id === user?.id || e.createdBy === user?.id;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Expense Detail</Text>
        {isOwner && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Main amount card */}
        <Card style={styles.amountCard}>
          <View style={[styles.categoryBubble, { backgroundColor: (e.category?.color ?? '#6b7280') + '22' }]}>
            <Text style={styles.categoryEmoji}>{e.category?.icon ?? '💳'}</Text>
          </View>
          <Text style={styles.expenseDescription}>{e.description}</Text>
          <Text style={styles.expenseAmount}>{formatCurrency(e.amount, e.currency)}</Text>
          {e.category && (
            <Badge variant="neutral" style={styles.categoryBadge}>
              {e.category.name}
            </Badge>
          )}
        </Card>

        {/* Metadata */}
        <Card>
          <View style={styles.metaRow}>
            <Calendar size={16} color="#6b7280" />
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{formatFullDate(e.date)}</Text>
          </View>

          {e.group && (
            <>
              <Divider />
              <View style={styles.metaRow}>
                <Users size={16} color="#6b7280" />
                <Text style={styles.metaLabel}>Group</Text>
                <TouchableOpacity onPress={() => router.push(`/(tabs)/groups/${e.groupId}`)}>
                  <Text style={[styles.metaValue, styles.metaLink]}>{e.group.name}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {e.notes && (
            <>
              <Divider />
              <View style={styles.metaRow}>
                <FileText size={16} color="#6b7280" />
                <Text style={styles.metaLabel}>Notes</Text>
                <Text style={[styles.metaValue, styles.notesText]} numberOfLines={4}>{e.notes}</Text>
              </View>
            </>
          )}
        </Card>

        {/* Paid by */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paid By</Text>
          <Card>
            <View style={styles.paidByRow}>
              <Avatar name={e.paidBy?.displayName} uri={e.paidBy?.avatarUrl} size="md" />
              <View style={styles.paidByInfo}>
                <Text style={styles.paidByName}>{e.paidBy?.displayName ?? 'Unknown'}</Text>
                <Text style={styles.paidByAmount}>{formatCurrency(e.amount, e.currency)}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Split breakdown */}
        {e.participants && e.participants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Split Between ({e.participants.length})</Text>
            {e.participants.map((p: any, i: number) => (
              <Card key={p.id ?? i} style={styles.participantCard}>
                <View style={styles.participantRow}>
                  <Avatar name={p.user?.displayName} uri={p.user?.avatarUrl} size="sm" />
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{p.user?.displayName ?? 'Unknown'}</Text>
                    {p.percentage != null && (
                      <Text style={styles.participantDetail}>{p.percentage.toFixed(1)}%</Text>
                    )}
                  </View>
                  <Text style={styles.participantAmount}>
                    {formatCurrency(p.amount, e.currency)}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  deleteBtn: { padding: 4 },
  content: { padding: 16, paddingBottom: 40 },
  amountCard: { alignItems: 'center', paddingVertical: 28, marginBottom: 16 },
  categoryBubble: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  categoryEmoji: { fontSize: 32 },
  expenseDescription: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  expenseAmount: { fontSize: 36, fontWeight: '800', color: '#111827', marginBottom: 10 },
  categoryBadge: {},
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  metaLabel: { fontSize: 13, color: '#9ca3af', width: 50 },
  metaValue: { flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' },
  metaLink: { color: '#22c55e', fontWeight: '500' },
  notesText: { textAlign: 'right', lineHeight: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  paidByRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paidByInfo: { flex: 1 },
  paidByName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  paidByAmount: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  participantCard: { marginBottom: 8, padding: 12 },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  participantDetail: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  participantAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
});
