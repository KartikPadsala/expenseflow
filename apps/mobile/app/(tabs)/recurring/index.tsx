import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Pause, Play, Trash2, Calendar } from 'lucide-react-native';
import {
  useRecurringExpenses, usePauseRecurring, useResumeRecurring, useDeleteRecurring,
} from '../../../hooks/use-recurring';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly',
};

const FREQ_ICONS: Record<string, string> = {
  DAILY: '📅', WEEKLY: '📆', MONTHLY: '🗓️', QUARTERLY: '📊', YEARLY: '🎯',
};

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(nextDueDate: string): boolean {
  return new Date(nextDueDate) < new Date();
}

export default function RecurringListScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useRecurringExpenses();
  const pause = usePauseRecurring();
  const resume = useResumeRecurring();
  const del = useDeleteRecurring();

  const items = data ?? [];
  const active = items.filter((r) => r.isActive);
  const paused = items.filter((r) => !r.isActive);

  function handleDelete(id: string, description: string) {
    Alert.alert('Delete Recurring Expense', `Delete "${description}"? This won't affect past expenses.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id) },
    ]);
  }

  function handleToggle(id: string, isActive: boolean) {
    if (isActive) {
      pause.mutate(id);
    } else {
      resume.mutate(id);
    }
  }

  if (isLoading) return <LoadingState fullScreen />;
  if (isError) return <ErrorState message="Could not load recurring expenses" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Recurring</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/recurring/new' as any)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <EmptyState
          title="No recurring expenses"
          description="Set up automatic recurring expenses like rent, subscriptions, or utilities."
          action={{ label: 'Add Recurring Expense', onPress: () => router.push('/recurring/new' as any) }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {active.length > 0 && (
            <Text style={styles.sectionHeader}>Active ({active.length})</Text>
          )}
          {active.map((r) => (
            <RecurringCard
              key={r.id}
              item={r}
              onPress={() => router.push(`/recurring/${r.id}` as any)}
              onToggle={() => handleToggle(r.id, r.isActive)}
              onDelete={() => handleDelete(r.id, r.description)}
              toggleLoading={pause.isPending}
            />
          ))}

          {paused.length > 0 && (
            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Paused ({paused.length})</Text>
          )}
          {paused.map((r) => (
            <RecurringCard
              key={r.id}
              item={r}
              onPress={() => router.push(`/recurring/${r.id}` as any)}
              onToggle={() => handleToggle(r.id, r.isActive)}
              onDelete={() => handleDelete(r.id, r.description)}
              toggleLoading={resume.isPending}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RecurringCard({ item, onPress, onToggle, onDelete, toggleLoading }: {
  item: any; onPress: () => void; onToggle: () => void; onDelete: () => void; toggleLoading: boolean;
}) {
  const overdue = item.isActive && isOverdue(item.nextDueDate);
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={[styles.card, !item.isActive && styles.cardPaused]}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.freqIcon}>{FREQ_ICONS[item.frequency] ?? '🔄'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.cardSub}>
                {FREQ_LABELS[item.frequency]}
                {item.group ? ` · ${item.group.name}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardAmount}>{formatCurrency(item.amount, item.currency)}</Text>
            <Badge
              label={item.isActive ? 'Active' : 'Paused'}
              variant={item.isActive ? 'success' : 'default'}
              size="sm"
            />
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={[styles.nextDue, overdue && styles.nextDueOverdue]}>
            <Calendar size={12} color={overdue ? '#dc2626' : '#6b7280'} />
            <Text style={[styles.nextDueText, overdue && styles.nextDueTextOverdue]}>
              {overdue ? 'Overdue · ' : 'Next: '}
              {formatDate(item.nextDueDate)}
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onToggle} disabled={toggleLoading}>
              {item.isActive
                ? <Pause size={16} color="#6b7280" />
                : <Play size={16} color="#16a34a" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
              <Trash2 size={16} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#6366f1', borderRadius: 20, padding: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  card: { padding: 14 },
  cardPaused: { opacity: 0.65 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  freqIcon: { fontSize: 24 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  nextDue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextDueOverdue: {},
  nextDueText: { fontSize: 12, color: '#6b7280' },
  nextDueTextOverdue: { color: '#dc2626', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f3f4f6' },
});
