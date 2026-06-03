import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, XCircle, Clock, ArrowRight, Banknote, CreditCard, Send } from 'lucide-react-native';
import { useSettlement, useCompleteSettlement, useCancelSettlement } from '../../../hooks/use-settlements';
import { useAuthStore } from '../../../store/auth.store';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Divider } from '../../../components/ui/Divider';

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}
function formatDateLong(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <Banknote size={16} color="#6b7280" />,
  BANK_TRANSFER: <CreditCard size={16} color="#6b7280" />,
  PAYPAL: <Send size={16} color="#6b7280" />,
};

function statusColor(status: string) {
  if (status === 'COMPLETED') return '#16a34a';
  if (status === 'CANCELLED') return '#dc2626';
  return '#d97706';
}

export default function SettlementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: settlement, isLoading, isError, refetch } = useSettlement(id);
  const complete = useCompleteSettlement();
  const cancel = useCancelSettlement();

  if (isLoading) return <LoadingState fullScreen />;
  if (isError || !settlement) return <ErrorState message="Settlement not found" onRetry={refetch} />;

  const isPayer = settlement.payerId === user?.id;
  const isPayee = settlement.payeeId === user?.id;
  const isPending = settlement.status === 'PENDING';

  function handleComplete() {
    Alert.alert('Mark as Completed', 'Confirm you received this payment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', style: 'default',
        onPress: () => complete.mutate(settlement!.id, {
          onSuccess: () => Alert.alert('Done', 'Settlement marked as completed.'),
          onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed'),
        }),
      },
    ]);
  }

  function handleCancel() {
    Alert.alert('Cancel Settlement', 'Are you sure you want to cancel this settlement?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: () => cancel.mutate(settlement!.id, {
          onSuccess: () => { Alert.alert('Cancelled', 'Settlement has been cancelled.'); router.back(); },
          onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed'),
        }),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settlement Details</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Amount Card */}
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>{isPayer ? 'You sent' : 'You received'}</Text>
          <Text style={[styles.amount, isPayer ? styles.amtRed : styles.amtGreen]}>
            {formatCurrency(settlement.amount, settlement.currency)}
          </Text>
          <View style={styles.statusRow}>
            {settlement.status === 'COMPLETED' ? <CheckCircle size={16} color="#16a34a" /> :
             settlement.status === 'CANCELLED' ? <XCircle size={16} color="#dc2626" /> :
             <Clock size={16} color="#d97706" />}
            <Text style={[styles.statusText, { color: statusColor(settlement.status) }]}>
              {settlement.status.charAt(0) + settlement.status.slice(1).toLowerCase()}
            </Text>
          </View>
        </Card>

        {/* Parties */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Parties</Text>
          <View style={styles.partiesRow}>
            <View style={styles.party}>
              <Avatar name={settlement.payer?.displayName ?? 'Payer'} uri={settlement.payer?.avatarUrl} size={44} />
              <Text style={styles.partyName}>{settlement.payer?.displayName}</Text>
              <Text style={styles.partyRole}>Payer</Text>
            </View>
            <ArrowRight size={24} color="#6b7280" />
            <View style={styles.party}>
              <Avatar name={settlement.payee?.displayName ?? 'Payee'} uri={settlement.payee?.avatarUrl} size={44} />
              <Text style={styles.partyName}>{settlement.payee?.displayName}</Text>
              <Text style={styles.partyRole}>Payee</Text>
            </View>
          </View>
        </Card>

        {/* Details */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Method</Text>
            <View style={styles.detailValueRow}>
              {METHOD_ICONS[settlement.method] ?? null}
              <Text style={styles.detailValue}>
                {settlement.method.replace('_', ' ').charAt(0) + settlement.method.replace('_', ' ').slice(1).toLowerCase()}
              </Text>
            </View>
          </View>
          <Divider />
          {settlement.group && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Group</Text>
                <Text style={styles.detailValue}>{settlement.group.name}</Text>
              </View>
              <Divider />
            </>
          )}
          {settlement.notes && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>{settlement.notes}</Text>
              </View>
              <Divider />
            </>
          )}
        </Card>

        {/* Timeline */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timeline}>
            <TimelineEvent
              label="Settlement created"
              date={settlement.createdAt}
              color="#6366f1"
              isLast={!settlement.settledAt && settlement.status !== 'CANCELLED'}
            />
            {settlement.settledAt && (
              <TimelineEvent
                label="Marked as completed"
                date={settlement.settledAt}
                color="#16a34a"
                isLast
              />
            )}
            {settlement.status === 'CANCELLED' && (
              <TimelineEvent
                label="Settlement cancelled"
                date={settlement.createdAt}
                color="#dc2626"
                isLast
              />
            )}
          </View>
        </Card>

        {/* Actions */}
        {isPending && (
          <View style={styles.actions}>
            {isPayee && (
              <Button
                title="Mark as Completed"
                onPress={handleComplete}
                loading={complete.isPending}
                style={styles.btnComplete}
              />
            )}
            {(isPayer || isPayee) && (
              <Button
                title="Cancel Settlement"
                onPress={handleCancel}
                loading={cancel.isPending}
                variant="outline"
                style={styles.btnCancel}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineEvent({ label, date, color, isLast }: { label: string; date: string; color: string; isLast: boolean }) {
  return (
    <View style={tlStyles.row}>
      <View style={tlStyles.left}>
        <View style={[tlStyles.dot, { backgroundColor: color }]} />
        {!isLast && <View style={tlStyles.line} />}
      </View>
      <View style={tlStyles.info}>
        <Text style={tlStyles.label}>{label}</Text>
        <Text style={tlStyles.date}>{formatDateLong(date)} at {formatTime(date)}</Text>
      </View>
    </View>
  );
}

const tlStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, minHeight: 52 },
  left: { alignItems: 'center', width: 20 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  line: { flex: 1, width: 2, backgroundColor: '#e5e7eb', marginVertical: 2 },
  info: { flex: 1, paddingBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827' },
  date: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  amountCard: { alignItems: 'center', padding: 24 },
  amountLabel: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  amount: { fontSize: 36, fontWeight: '800', marginBottom: 8 },
  amtRed: { color: '#dc2626' },
  amtGreen: { color: '#16a34a' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 14, fontWeight: '600' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  partiesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  party: { alignItems: 'center', gap: 6 },
  partyName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  partyRole: { fontSize: 12, color: '#6b7280' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  detailValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeline: { gap: 0 },
  actions: { gap: 10 },
  btnComplete: { backgroundColor: '#16a34a' },
  btnCancel: {},
});
