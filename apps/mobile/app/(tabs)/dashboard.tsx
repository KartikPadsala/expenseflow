import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGroups } from '../../hooks/use-groups';
import { useExpenses } from '../../hooks/use-expenses';
import { useAuthStore } from '../../store/auth.store';
import { ExpenseItem } from '../../components/ExpenseItem';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '@expenseflow/shared';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { data: groups, refetch: refetchGroups } = useGroups();
  const { data: expenses, refetch: refetchExpenses, isLoading } = useExpenses();

  const onRefresh = () => { refetchGroups(); refetchExpenses(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#22c55e" />}
      >
        <Text style={styles.greeting}>Hey, {user?.displayName?.split(' ')[0]} 👋</Text>
        <Text style={styles.subgreeting}>Here&apos;s your expense overview</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Groups</Text>
            <Text style={styles.statValue}>{groups?.length || 0}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={styles.statValue}>{expenses?.total || 0}</Text>
          </Card>
        </View>

        {/* Recent expenses */}
        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        {expenses?.data.slice(0, 10).map((e: any) => (
          <ExpenseItem key={e.id} expense={e} />
        ))}
        {!expenses?.data.length && (
          <Text style={styles.empty}>No expenses yet. Add your first expense!</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subgreeting: { fontSize: 15, color: '#6b7280', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 32, fontWeight: '700', color: '#22c55e' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 32, fontSize: 15 },
});
