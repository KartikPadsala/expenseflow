import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, ArrowRight, Home } from 'lucide-react-native';

function formatCurrency(amount: string, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    parseFloat(amount) || 0,
  );
}

export default function SettlementSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    settlementId?: string;
    payeeName?: string;
    amount?: string;
    currency?: string;
  }>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Success Icon */}
        <View style={styles.iconWrapper}>
          <CheckCircle size={72} color="#16a34a" />
        </View>

        <Text style={styles.title}>Settlement Recorded!</Text>
        <Text style={styles.subtitle}>
          Your payment
          {params.amount && params.currency
            ? ` of ${formatCurrency(params.amount, params.currency)}`
            : ''}
          {params.payeeName ? ` to ${params.payeeName}` : ''} has been recorded and is awaiting confirmation.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            The recipient will mark the settlement as completed once they confirm the payment.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {params.settlementId && (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => router.replace(`/(tabs)/settlements/${params.settlementId}`)}
            >
              <Text style={styles.btnPrimaryText}>View Settlement</Text>
              <ArrowRight size={18} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.replace('/(tabs)/settlements')}
          >
            <Home size={18} color="#6366f1" />
            <Text style={styles.btnSecondaryText}>Go to Settlements</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    width: '100%',
  },
  infoText: { fontSize: 14, color: '#1d4ed8', textAlign: 'center', lineHeight: 20 },
  actions: { width: '100%', gap: 12, marginTop: 8 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnSecondaryText: { fontSize: 16, fontWeight: '600', color: '#6366f1' },
});
