import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ChevronDown, Check } from 'lucide-react-native';
import { useCreateSettlement } from '../../../hooks/use-settlements';
import { useFriends } from '../../../hooks/use-friends';
import { useGroups } from '../../../hooks/use-groups';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Avatar } from '../../../components/ui/Avatar';

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'PAYPAL', 'WISE', 'INTERAC', 'OTHER'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];

const schema = z.object({
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter a valid amount'),
  currency: z.string().length(3),
  method: z.string(),
  notes: z.string().max(300).optional(),
});
type FormData = z.infer<typeof schema>;

interface Friend { id: string; displayName: string; avatarUrl?: string; email: string; }

export default function NewSettlementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ payeeId?: string; payeeName?: string; amount?: string; groupId?: string; currency?: string }>();

  const createSettlement = useCreateSettlement();
  const { data: friendsData } = useFriends();
  const { data: groups } = useGroups();

  const friends: Friend[] = (friendsData?.friends ?? []).map((f: any) => ({
    id: f.id, displayName: f.displayName, avatarUrl: f.avatarUrl, email: f.email,
  }));

  const [selectedPayee, setSelectedPayee] = useState<Friend | null>(
    params.payeeId ? { id: params.payeeId, displayName: params.payeeName ?? '', avatarUrl: undefined, email: '' } : null,
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(params.groupId);
  const [showPayeePicker, setShowPayeePicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: params.amount ?? '',
      currency: params.currency ?? 'USD',
      method: 'CASH',
      notes: '',
    },
  });

  function onSubmit(data: FormData) {
    if (!selectedPayee) { Alert.alert('Validation', 'Please select who you are paying.'); return; }
    createSettlement.mutate({
      payeeId: selectedPayee.id,
      amount: parseFloat(data.amount),
      currency: data.currency,
      method: data.method,
      groupId: selectedGroupId,
      notes: data.notes || undefined,
    }, {
      onSuccess: (settlement) => {
        router.replace({
          pathname: '/(tabs)/settlements/success',
          params: {
            settlementId: settlement.id,
            payeeName: selectedPayee.displayName,
            amount: String(settlement.amount),
            currency: settlement.currency,
          },
        });
      },
      onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to create settlement'),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.dismiss()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Record Settlement</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Payee Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Paying to *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowPayeePicker(true)}>
            {selectedPayee ? (
              <View style={styles.pickerValueRow}>
                <Avatar name={selectedPayee.displayName} uri={selectedPayee.avatarUrl} size={28} />
                <Text style={styles.pickerValue}>{selectedPayee.displayName}</Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Select person</Text>
            )}
            <ChevronDown size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => (
            <Input label="Amount *" value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount?.message} />
          )}
        />

        {/* Currency */}
        <Controller
          control={control}
          name="currency"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyRow}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity key={c} style={[styles.currencyChip, value === c && styles.currencyChipActive]} onPress={() => onChange(c)}>
                    <Text style={[styles.currencyText, value === c && styles.currencyTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        />

        {/* Method */}
        <Controller
          control={control}
          name="method"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.methodGrid}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity key={m} style={[styles.methodChip, value === m && styles.methodChipActive]} onPress={() => onChange(m)}>
                    <Text style={[styles.methodText, value === m && styles.methodTextActive]}>
                      {m.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />

        {/* Group (optional) */}
        <View style={styles.field}>
          <Text style={styles.label}>Group (optional)</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowGroupPicker(true)}>
            <Text style={selectedGroupId ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedGroupId ? (groups ?? []).find((g: any) => g.id === selectedGroupId)?.name ?? 'Selected' : 'No group'}
            </Text>
            <ChevronDown size={18} color="#6b7280" />
          </TouchableOpacity>
          {selectedGroupId && (
            <TouchableOpacity onPress={() => setSelectedGroupId(undefined)}>
              <Text style={styles.clearLink}>Clear group</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notes */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <Input label="Notes (optional)" value={value ?? ''} onChangeText={onChange} placeholder="Add a note..." multiline numberOfLines={3} />
          )}
        />

        <Button title="Record Settlement" onPress={handleSubmit(onSubmit)} loading={createSettlement.isPending} style={styles.submitBtn} />
      </ScrollView>

      {/* Payee Picker Modal */}
      <Modal visible={showPayeePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPayeePicker(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Person</Text>
            <TouchableOpacity onPress={() => setShowPayeePicker(false)}><X size={20} color="#111827" /></TouchableOpacity>
          </View>
          <FlatList
            data={friends}
            keyExtractor={(f) => f.id}
            renderItem={({ item: f }) => (
              <TouchableOpacity style={styles.friendRow} onPress={() => { setSelectedPayee(f); setShowPayeePicker(false); }}>
                <Avatar name={f.displayName} uri={f.avatarUrl} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{f.displayName}</Text>
                  <Text style={styles.friendEmail}>{f.email}</Text>
                </View>
                {selectedPayee?.id === f.id && <Check size={18} color="#6366f1" />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No friends found. Add friends first.</Text>}
          />
        </SafeAreaView>
      </Modal>

      {/* Group Picker Modal */}
      <Modal visible={showGroupPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGroupPicker(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Group</Text>
            <TouchableOpacity onPress={() => setShowGroupPicker(false)}><X size={20} color="#111827" /></TouchableOpacity>
          </View>
          <FlatList
            data={groups ?? []}
            keyExtractor={(g: any) => g.id}
            renderItem={({ item: g }: { item: any }) => (
              <TouchableOpacity style={styles.friendRow} onPress={() => { setSelectedGroupId(g.id); setShowGroupPicker(false); }}>
                <View style={styles.groupIcon}><Text style={styles.groupIconText}>{g.name[0]}</Text></View>
                <Text style={{ flex: 1, fontSize: 15, color: '#111827' }}>{g.name}</Text>
                {selectedGroupId === g.id && <Check size={18} color="#6366f1" />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  pickerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  pickerPlaceholder: { fontSize: 15, color: '#9ca3af' },
  currencyRow: { flexDirection: 'row', gap: 8 },
  currencyChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  currencyChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  currencyText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  currencyTextActive: { color: '#fff' },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  methodChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  methodText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  methodTextActive: { color: '#fff' },
  clearLink: { fontSize: 13, color: '#6366f1', marginTop: 4 },
  submitBtn: { marginTop: 8 },
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  friendName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  friendEmail: { fontSize: 13, color: '#6b7280' },
  groupIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  groupIconText: { fontSize: 16, fontWeight: '700', color: '#6366f1' },
  emptyText: { padding: 24, textAlign: 'center', color: '#6b7280' },
});
