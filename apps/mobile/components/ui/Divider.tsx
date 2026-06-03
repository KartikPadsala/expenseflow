import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface DividerProps {
  label?: string;
  style?: ViewStyle;
}

export function Divider({ label, style }: DividerProps) {
  if (!label) {
    return <View style={[styles.divider, style]} />;
  }
  return (
    <View style={[styles.row, style]}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  label: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
});
