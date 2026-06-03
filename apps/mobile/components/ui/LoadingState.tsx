import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';

interface LoadingStateProps {
  message?: string;
  style?: ViewStyle;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function LoadingState({
  message,
  style,
  size = 'large',
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size={size} color="#22c55e" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  fullScreen: { flex: 1 },
  message: { fontSize: 14, color: '#6b7280' },
});
