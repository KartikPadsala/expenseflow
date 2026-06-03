import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react-native';
import { useRecurringExpense, useUpdateRecurring } from '../../../hooks/use-recurring';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;

const schema = z.object({
  description: z.string().min(1).max(120),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter valid amount'),
  currency: z.string().length(3),
  frequency: z.enum(FREQUENCIES),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  notes: z.string().max(300).optional(),
});
type FormData = z.infer<typeof schema>;

export default function EditRecurringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: r, isLoading } = useRecurringExpense(id);
  const update = useUpdateRecurring();

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { description: '', amount: '', currency: 'USD', frequency: 'MONTHLY', endDate: '', notes: '' },
  });

  useEffect(() => {
    if (r) {
      reset({
        description: r.description,
        amount: String(r.amount),
        currency: r.currency,
        frequency: r.frequency as any,
        endDate: r.endDate ? r.endDate.slice(0, 10) : '',
        notes: r.notes ?? '',
      });
    }
  }, [r]);

  const frequency = watch('frequency');

  function onSubmit(data: FormData) {
    update.mutate({
      id: id!,
      description: data.description,
      amount: parseFloat(data.amount),
      currency: data.currency,
      frequency: data.frequency,
      endDate: data.endDate || undefined,
      notes: data.notes || undefined,
    }, {
      onSuccess: () => router.dismiss(),
      onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Update failed'),
    });
  }

  if (isLoading) return <LoadingState fullScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.dismiss()}><X size={22} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Recurring Expense</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
          <Input label="Description *" value={value} onChangeText={onChange} error={errors.description?.message} />
        )} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (
              <Input label="Amount *" value={value} onChangeText={onChange} keyboardType="decimal-pad" error={errors.amount?.message} />
            )} />
          </View>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="currency" render={({ field: { onChange, value } }) => (
              <Input label="Currency" value={value} onChangeText={(v) => onChange(v.toUpperCase().slice(0, 3))} autoCapitalize="characters" maxLength={3} />
            )} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Frequency *</Text>
          <Controller control={control} name="frequency" render={({ field: { onChange, value } }) => (
            <View style={styles.freqRow}>
              {FREQUENCIES.map((f) => (
                <TouchableOpacity key={f} style={[styles.chip, value === f && styles.chipActive]} onPress={() => onChange(f)}>
                  <Text style={[styles.chipText, value === f && styles.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )} />
        </View>

        <Controller control={control} name="endDate" render={({ field: { onChange, value } }) => (
          <Input label="End Date (optional)" value={value ?? ''} onChangeText={onChange} placeholder="YYYY-MM-DD" />
        )} />

        <Controller control={control} name="notes" render={({ field: { onChange, value } }) => (
          <Input label="Notes (optional)" value={value ?? ''} onChangeText={onChange} multiline numberOfLines={2} />
        )} />

        <Button title="Save Changes" onPress={handleSubmit(onSubmit)} loading={update.isPending} style={styles.submitBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 12 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  submitBtn: { marginTop: 8 },
});
