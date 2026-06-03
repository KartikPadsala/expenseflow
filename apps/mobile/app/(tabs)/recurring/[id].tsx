import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Edit2, RefreshCw } from 'lucide-react-native';
import { useRecurringExpense, usePauseRecurring, useResumeRecurring, useDeleteRecurring } from '../../../hooks/use-recurring';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Divider } from '../../../components/ui/Divider';

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly',
};

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function RecurringDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: r, isLoading, isError, refetch } = useRecurringExpense(id);
  const pause = usePauseRecurring();
  const resume = useResumeRecurring();
  const del = useDeleteRecurring();

  if (isLoading) return <LoadingState fullScreen />;
  if (isError || !r) return <ErrorState message="Could not load recurring expense" onRetry={refetch} />;

  function handleDelete() {
    Alert.alert('Delete', `Delete "${r!.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () =>
          del.mutate(r!.id, { onSuccess: () => router.back() }),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{r.description}</Text>
        <TouchableOpacity onPress={() => router.push(`/recurring/edit/${r.id}` as any)}>
          <Edit2 size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <Text style={styles.heroAmount}>{formatCurrency(r.amount, r.currency)}</Text>
          <View style={styles.heroRow}>
            <RefreshCw size={16} color="#6b7280" />
            <Text style={styles.heroFreq}>{FREQ_LABELS[r.frequency]}</Text>
            <Badge label={r.isActive ? 'Active' : 'Paused'} variant={r.isActive ? 'success' : 'default'} />
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <DetailRow label="Next Due" value={formatDate(r.nextDueDate)} />
          <Divider />
          {r.endDate && <><DetailRow label="Ends On" value={formatDate(r.endDate)} /><Divider /></>}
          {r.group && <><DetailRow label="Group" value={r.group.name} /><Divider /></>}
          {r.category && <><DetailRow label="Category" value={`${r.category.icon} ${r.category.name}`} /><Divider /></>}
          <DetailRow label="Split" value={r.splitMethod} />
          {r.notes && <><Divider /><DetailRow label="Notes" value={r.notes} /></>}
        </Card>

        <View style={styles.actions}>
          {r.isActive ? (
            <Button
              title="Pause"
              onPress={() => pause.mutate(r.id)}
              loading={pause.isPending}
              variant="outline"
              style={styles.actionBtn}
            />
          ) : (
            <Button
              title="Resume"
              onPress={() => resume.mutate(r.id)}
              loading={resume.isPending}
              style={[styles.actionBtn, { backgroundColor: '#16a34a' }]}
            />
          )}
          <Button
            title="Delete"
            onPress={handleDelete}
            loading={del.isPending}
            variant="outline"
            style={[styles.actionBtn, styles.deleteBtn]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={drStyles.row}>
      <Text style={drStyles.label}>{label}</Text>
      <Text style={drStyles.value}>{value}</Text>
    </View>
  );
}

const drStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 14, color: '#6b7280' },
  value: { fontSize: 14, fontWeight: '500', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 12 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  hero: { alignItems: 'center', padding: 24 },
  heroAmount: { fontSize: 36, fontWeight: '800', color: '#111827', marginBottom: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroFreq: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1 },
  deleteBtn: { borderColor: '#fca5a5' },
});
