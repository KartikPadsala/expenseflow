import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Search, X, Plus } from 'lucide-react-native';
import { useExpenses } from '../../../hooks/use-expenses';
import { useCategories } from '../../../hooks/use-categories';
import { Card } from '../../../components/ui/Card';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Avatar } from '../../../components/ui/Avatar';

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ExpensesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);

  const categories = useCategories();
  const expenses = useExpenses({ search, categoryId: selectedCategory, page, limit: 20 });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setAllExpenses([]);
    await qc.invalidateQueries({ queryKey: ['expenses'] });
    setRefreshing(false);
  }, [qc]);

  // Accumulate pages
  React.useEffect(() => {
    if (expenses.data?.data) {
      if (page === 1) {
        setAllExpenses(expenses.data.data);
      } else {
        setAllExpenses((prev) => [...prev, ...expenses.data!.data]);
      }
    }
  }, [expenses.data, page]);

  // Reset when search/filter changes
  React.useEffect(() => {
    setPage(1);
    setAllExpenses([]);
  }, [search, selectedCategory]);

  const handleSearchChange = (text: string) => {
    setInputValue(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setSearch(text), 400);
  };

  const handleLoadMore = () => {
    if (!expenses.isLoading && expenses.data && page < (expenses.data.totalPages ?? 1)) {
      setPage((p) => p + 1);
    }
  };

  const hasMore = expenses.data ? page < (expenses.data.totalPages ?? 1) : false;

  if (expenses.isLoading && page === 1) {
    return <LoadingState fullScreen message="Loading expenses..." />;
  }
  if (expenses.isError && page === 1) {
    return <ErrorState message={(expenses.error as any)?.message} onRetry={expenses.refetch} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            value={inputValue}
            onChangeText={handleSearchChange}
            placeholder="Search expenses..."
            placeholderTextColor="#9ca3af"
          />
          {inputValue.length > 0 && (
            <TouchableOpacity onPress={() => { setInputValue(''); setSearch(''); }}>
              <X size={14} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.chip, !selectedCategory && styles.chipActive]}
            onPress={() => setSelectedCategory(undefined)}
          >
            <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {(categories.data ?? []).map((c: any) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, selectedCategory === c.id && styles.chipActive]}
              onPress={() => setSelectedCategory(selectedCategory === c.id ? undefined : c.id)}
            >
              <Text style={styles.chipEmoji}>{c.icon}</Text>
              <Text style={[styles.chipText, selectedCategory === c.id && styles.chipTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={allExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/expenses/${item.id}`)}
            activeOpacity={0.8}
            style={styles.expenseItem}
          >
            <Card style={styles.expenseCard} noPadding>
              <View style={styles.expenseRow}>
                <View style={[styles.categoryIcon, { backgroundColor: (item.category?.color ?? '#6b7280') + '22' }]}>
                  <Text style={styles.categoryEmoji}>{item.category?.icon ?? '💳'}</Text>
                </View>
                <View style={styles.expenseMain}>
                  <Text style={styles.expenseDesc} numberOfLines={1}>{item.description}</Text>
                  <View style={styles.expenseMeta}>
                    <Avatar name={item.paidBy?.displayName} uri={item.paidBy?.avatarUrl} size="xs" />
                    <Text style={styles.expenseMetaText}>
                      {item.paidBy?.displayName ?? 'Unknown'} · {formatDate(item.date)}
                    </Text>
                    {item.group && (
                      <Text style={styles.expenseGroup} numberOfLines={1}>· {item.group.name}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.expenseAmount}>
                  {formatCurrency(item.amount, item.currency)}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <EmptyState
            emoji="💳"
            title={search ? 'No expenses found' : 'No expenses yet'}
            message={search ? 'Try different search terms' : 'Expenses added to your groups will appear here'}
          />
        }
        ListFooterComponent={
          hasMore || (expenses.isLoading && page > 1) ? (
            <ActivityIndicator size="small" color="#22c55e" style={styles.loadingMore} />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={fabStyles.fab}
        onPress={() => router.push('/(tabs)/expenses/new')}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  searchRow: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  filterRow: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filterContent: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#dcfce7' },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  chipTextActive: { color: '#16a34a' },
  listContent: { padding: 16, paddingBottom: 32 },
  expenseItem: { marginBottom: 10 },
  expenseCard: { padding: 14 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  categoryEmoji: { fontSize: 22 },
  expenseMain: { flex: 1, minWidth: 0 },
  expenseDesc: { fontSize: 15, fontWeight: '600', color: '#111827' },
  expenseMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  expenseMetaText: { fontSize: 12, color: '#9ca3af' },
  expenseGroup: { fontSize: 12, color: '#9ca3af', flex: 1 },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: '#111827', flexShrink: 0 },
  loadingMore: { padding: 16 },
});

const fabStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
