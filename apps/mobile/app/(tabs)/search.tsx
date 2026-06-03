import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Receipt, Users, UserCircle2 } from 'lucide-react-native';
import { useSearch } from '../../../hooks/use-search';

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQ(inputValue), 400);
    return () => clearTimeout(timerRef.current);
  }, [inputValue]);

  const { data, isLoading, isFetching } = useSearch(debouncedQ);

  const totalResults = data
    ? data.expenses.length + data.groups.length + data.users.length
    : 0;

  const showSpinner = isLoading || isFetching;

  return (
    <SafeAreaView style={styles.container}>
      {/* Search input */}
      <View style={styles.searchBox}>
        {showSpinner ? (
          <ActivityIndicator size="small" color="#9ca3af" style={styles.searchIcon} />
        ) : (
          <Search size={18} color="#9ca3af" style={styles.searchIcon} />
        )}
        <TextInput
          style={styles.input}
          placeholder="Search expenses, groups, people..."
          placeholderTextColor="#9ca3af"
          value={inputValue}
          onChangeText={setInputValue}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {inputValue.length > 0 && (
          <TouchableOpacity onPress={() => setInputValue('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {debouncedQ.trim().length < 2 && (
          <View style={styles.empty}>
            <Search size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>Type at least 2 characters to search</Text>
          </View>
        )}

        {debouncedQ.trim().length >= 2 && !isLoading && totalResults === 0 && (
          <View style={styles.empty}>
            <Search size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No results for &ldquo;{debouncedQ}&rdquo;</Text>
          </View>
        )}

        {/* Expenses */}
        {data && data.expenses.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Expenses" count={data.expenses.length} />
            {data.expenses.map((exp) => (
              <TouchableOpacity
                key={exp.id}
                style={styles.item}
                onPress={() => router.push(`/expenses/${exp.id}` as any)}
              >
                <View style={[styles.itemIcon, { backgroundColor: '#eef2ff' }]}>
                  <Receipt size={18} color="#6366f1" />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{exp.description}</Text>
                  <Text style={styles.itemSub}>
                    {exp.paidBy?.displayName} · {new Date(exp.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.itemAmount}>{formatAmount(exp.amount, exp.currency)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Groups */}
        {data && data.groups.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Groups" count={data.groups.length} />
            {data.groups.map((grp) => (
              <TouchableOpacity
                key={grp.id}
                style={styles.item}
                onPress={() => router.push(`/groups/${grp.id}` as any)}
              >
                <View style={[styles.itemIcon, { backgroundColor: '#f5f3ff' }]}>
                  <Users size={18} color="#8b5cf6" />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle}>{grp.name}</Text>
                  <Text style={styles.itemSub}>{grp._count.members} members</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Users */}
        {data && data.users.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="People" count={data.users.length} />
            {data.users.map((usr) => (
              <View key={usr.id} style={styles.item}>
                <View style={[styles.itemIcon, { backgroundColor: '#ecfdf5' }]}>
                  <UserCircle2 size={18} color="#10b981" />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle}>{usr.displayName}</Text>
                  <Text style={styles.itemSub}>@{usr.username}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  clearBtn: { fontSize: 14, color: '#9ca3af', paddingLeft: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 },
  badge: { backgroundColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 11, color: '#374151', fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  itemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  itemSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  itemAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
