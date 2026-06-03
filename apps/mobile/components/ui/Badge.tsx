import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[`variant_${variant}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  variant_default: { backgroundColor: '#dcfce7' },
  variant_success: { backgroundColor: '#dcfce7' },
  variant_warning: { backgroundColor: '#fef9c3' },
  variant_danger: { backgroundColor: '#fee2e2' },
  variant_info: { backgroundColor: '#dbeafe' },
  variant_neutral: { backgroundColor: '#f3f4f6' },
  text: { fontSize: 11, fontWeight: '600' },
  text_default: { color: '#16a34a' },
  text_success: { color: '#16a34a' },
  text_warning: { color: '#ca8a04' },
  text_danger: { color: '#dc2626' },
  text_info: { color: '#2563eb' },
  text_neutral: { color: '#6b7280' },
});
