import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, CheckCircle, Clock, XCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { useSettlements } from '../../../hooks/use-settlements';
import { useAuthStore } from '../../../store/auth.store';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';

const STATUS_FILTERS = ['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'] as const;

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'CANCELLED') return 'error';
  return 'warning';
}

export default function SettlementsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data, isLoading, isError, refetch, isRefetching } = useSettlements(
    statusFilter !== 'ALL' ? { status: statusFilter } : undefined,
  );

  const settlements = data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settlements</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/settlements/new')}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Status filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Could not load settlements" onRetry={refetch} />
      ) : settlements.length === 0 ? (
        <EmptyState
          title="No settlements yet"
          description="Record a payment when you settle up with someone."
          action={{ label: 'Record Settlement', onPress: () => router.push('/settlements/new') }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {settlements.map((s) => {
            const isPayer = s.payerId === user?.id;
            return (
              <TouchableOpacity key={s.id} onPress={() => router.push(`/settlements/${s.id}`)}>
                <Card style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.directionIcon}>
                      {isPayer
                        ? <ArrowUpRight size={18} color="#dc2626" />
                        : <ArrowDownLeft size={18} color="#16a34a" />}
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>
                        {isPayer
                          ? `You paid ${s.payee?.displayName ?? 'someone'}`
                          : `${s.payer?.displayName ?? 'Someone'} paid you`}
                      </Text>
                      <Text style={styles.cardSub}>
                        {s.group ? `${s.group.name} · ` : ''}{formatDate(s.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={[styles.cardAmount, isPayer ? styles.amtRed : styles.amtGreen]}>
                        {formatCurrency(s.amount, s.currency)}
                      </Text>
                      <Badge
                        label={s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                        variant={statusBadgeVariant(s.status)}
                        size="sm"
                      />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  newBtn: { backgroundColor: '#6366f1', borderRadius: 20, padding: 8 },
  filtersRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filterChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  filterText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  card: { padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  directionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#6b7280' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardAmount: { fontSize: 15, fontWeight: '700' },
  amtRed: { color: '#dc2626' },
  amtGreen: { color: '#16a34a' },
});
