import { Text, TextStyle, StyleSheet } from 'react-native';

interface ThemedTextProps {
  children: React.ReactNode;
  style?: TextStyle;
  type?: 'title' | 'subtitle' | 'body' | 'caption';
}

export function ThemedText({ children, style, type = 'body' }: ThemedTextProps) {
  return <Text style={[styles[type], style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 20, fontWeight: '600', color: '#111827' },
  body: { fontSize: 16, color: '#374151' },
  caption: { fontSize: 12, color: '#6b7280' },
});
