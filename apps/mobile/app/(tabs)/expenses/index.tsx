import { View, Text, FlatList, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useExpenses } from '../../../hooks/use-expenses';
import { ExpenseItem } from '../../../components/ExpenseItem';
import { Search } from 'lucide-react-native';

export default function ExpensesScreen() {
  const [search, setSearch] = useState('');
  const { data: expenses, isLoading } = useExpenses();
  const filtered = expenses?.data.filter((e: any) =>
    e.description.toLowerCase().includes(search.toLowerCase()),
  ) || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Expenses</Text>
      <View style={styles.searchContainer}>
        <Search size={16} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search expenses..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ExpenseItem expense={item} />}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No expenses found</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, margin: 16, marginTop: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#111827' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 48 },
});
