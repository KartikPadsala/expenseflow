import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <AlertCircle size={40} color="#ef4444" />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {onRetry && (
        <Button variant="outline" size="sm" onPress={onRetry} style={styles.retryBtn}>
          Try Again
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center' },
  message: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 8 },
});
