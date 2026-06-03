import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { formatCurrency } from '@expenseflow/shared';

export default function AnalyticsScreen() {
  const { data: spending } = useQuery({
    queryKey: ['analytics-mobile'],
    queryFn: async () => {
      const [s, c] = await Promise.all([
        api.get('/analytics/spending?period=month'),
        api.get('/analytics/categories?period=month'),
      ]);
      return { spending: s.data.data, categories: c.data.data };
    },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Analytics</Text>

        <Card>
          <Text style={styles.cardTitle}>This Month</Text>
          <Text style={styles.bigAmount}>{formatCurrency(spending?.spending?.total || 0, 'USD')}</Text>
          <Text style={styles.cardMeta}>{spending?.spending?.expenseCount || 0} expenses</Text>
        </Card>

        <Text style={styles.sectionTitle}>By Category</Text>
        {spending?.categories?.map((cat: any) => (
          <View key={cat.id} style={styles.categoryRow}>
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <View style={styles.catInfo}>
              <Text style={styles.catName}>{cat.name}</Text>
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, (cat.total / (spending?.spending?.total || 1)) * 100)}%`,
                      backgroundColor: cat.color,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.catAmount}>{formatCurrency(cat.total, 'USD')}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 16 },
  cardTitle: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  bigAmount: { fontSize: 36, fontWeight: '700', color: '#22c55e' },
  cardMeta: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 8 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  catIcon: { fontSize: 24, width: 32 },
  catInfo: { flex: 1 },
  catName: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  catAmount: { fontSize: 14, fontWeight: '600', color: '#111827', width: 70, textAlign: 'right' },
});
