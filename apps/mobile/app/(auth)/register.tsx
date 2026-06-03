import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';

export default function RegisterScreen() {
  const [form, setForm] = useState({ email: '', username: '', displayName: '', password: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.username || !form.displayName) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      Alert.alert('Success', 'Account created! Please check your email to verify.', [
        { text: 'OK', onPress: () => router.push('/(auth)/login') },
      ]);
    } catch (err: any) {
      Alert.alert('Registration Failed', err?.response?.data?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>💸</Text>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join ExpenseFlow for free</Text>
        </View>
        <View style={styles.form}>
          {[
            { key: 'displayName', label: 'Full Name', placeholder: 'John Doe' },
            { key: 'email', label: 'Email', placeholder: 'you@example.com', keyboard: 'email-address' },
            { key: 'username', label: 'Username', placeholder: 'johndoe' },
            { key: 'password', label: 'Password', placeholder: '••••••••', secure: true },
          ].map(({ key, label, placeholder, keyboard, secure }) => (
            <TextInput
              key={key}
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              keyboardType={keyboard as any}
              autoCapitalize="none"
              secureTextEntry={secure}
              value={form[key as keyof typeof form]}
              onChangeText={(val) => setForm({ ...form, [key]: val })}
            />
          ))}
          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 60, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  form: { gap: 16 },
  input: {
    height: 52, borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 16,
    fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', color: '#111827',
  },
  button: { height: 52, borderRadius: 12, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { textAlign: 'center', color: '#6b7280', marginTop: 16 },
  linkBold: { color: '#22c55e', fontWeight: '600' },
});
