import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, ArrowLeft } from 'lucide-react-native';
import { useForgotPassword } from '../../hooks/use-auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { mutate: sendReset, isPending, isSuccess, error } = useForgotPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = (data: ForgotForm) => sendReset(data.email);

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <CheckCircle size={64} color="#22c55e" />
          <Text style={styles.successTitle}>Check your inbox</Text>
          <Text style={styles.successText}>
            If an account exists for {getValues('email')}, we&apos;ve sent password reset instructions.
          </Text>
          <Button onPress={() => router.replace('/(auth)/login')} style={styles.backBtn}>
            Back to Sign In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <ArrowLeft size={20} color="#6b7280" />
            <Text style={styles.backLinkText}>Back to Sign In</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.logo}>🔑</Text>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email Address"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>
                  {(error as any)?.response?.data?.message || 'Something went wrong. Try again.'}
                </Text>
              </View>
            )}

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isPending}
              fullWidth
              style={styles.submitBtn}
            >
              Send Reset Link
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 },
  backLinkText: { fontSize: 14, color: '#6b7280' },
  header: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 6, textAlign: 'center', lineHeight: 20 },
  form: { gap: 16 },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBannerText: { fontSize: 13, color: '#dc2626', textAlign: 'center' },
  submitBtn: { marginTop: 8 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center' },
  successText: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  backBtn: { marginTop: 8 },
});
