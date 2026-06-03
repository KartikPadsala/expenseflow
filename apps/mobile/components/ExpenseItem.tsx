import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { formatCurrency, formatRelativeTime } from '@expenseflow/shared';

interface Props {
  expense: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    paidBy?: { displayName: string };
    category?: { icon: string; color: string } | null;
  };
}

export function ExpenseItem({ expense }: Props) {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.container} onPress={() => router.push(`/expenses/${expense.id}`)}>
      <View style={[styles.icon, { backgroundColor: (expense.category?.color || '#6b7280') + '20' }]}>
        <Text style={styles.emoji}>{expense.category?.icon || '💸'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={1}>{expense.description}</Text>
        <Text style={styles.meta}>
          {expense.paidBy?.displayName} · {formatRelativeTime(new Date(expense.date))}
        </Text>
      </View>
      <Text style={styles.amount}>{formatCurrency(Number(expense.amount), expense.currency)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
  info: { flex: 1 },
  description: { fontSize: 15, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', color: '#111827' },
});
