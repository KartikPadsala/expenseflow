import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ChevronDown, Check } from 'lucide-react-native';
import { useCreateRecurring } from '../../../hooks/use-recurring';
import { useGroups } from '../../../hooks/use-groups';
import { useCategories } from '../../../hooks/use-categories';
import { useFriends } from '../../../hooks/use-friends';
import { useAuthStore } from '../../../store/auth.store';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily', desc: 'Every day' },
  { value: 'WEEKLY', label: 'Weekly', desc: 'Every week' },
  { value: 'MONTHLY', label: 'Monthly', desc: 'Every month' },
  { value: 'QUARTERLY', label: 'Quarterly', desc: 'Every 3 months' },
  { value: 'YEARLY', label: 'Yearly', desc: 'Every year' },
] as const;

const SPLIT_METHODS = ['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];

function todayISO() { return new Date().toISOString().slice(0, 10); }

const schema = z.object({
  description: z.string().min(1, 'Description required').max(120),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter valid amount'),
  currency: z.string().length(3),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  splitMethod: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  notes: z.string().max(300).optional(),
});
type FormData = z.infer<typeof schema>;

interface Participant { userId: string; displayName: string; avatarUrl?: string; }

export default function NewRecurringScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const createRecurring = useCreateRecurring();
  const { data: groups } = useGroups();
  const { data: categoriesData } = useCategories();
  const { data: friendsRaw } = useFriends();

  const friends: Participant[] = (friendsRaw ?? []).map((f: any) => ({
    userId: f.id ?? f.userId, displayName: f.displayName, avatarUrl: f.avatarUrl,
  }));

  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [participants, setParticipants] = useState<Participant[]>([
    { userId: user?.id ?? '', displayName: user?.displayName ?? 'You', avatarUrl: user?.avatarUrl },
  ]);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '', amount: '', currency: 'USD',
      frequency: 'MONTHLY', splitMethod: 'EQUAL',
      startDate: todayISO(), endDate: '', notes: '',
    },
  });

  function toggleParticipant(p: Participant) {
    setParticipants((prev) => {
      const exists = prev.find((x) => x.userId === p.userId);
      if (exists) {
        if (p.userId === user?.id) return prev;
        return prev.filter((x) => x.userId !== p.userId);
      }
      return [...prev, p];
    });
  }

  function onSubmit(data: FormData) {
    createRecurring.mutate({
      description: data.description,
      amount: parseFloat(data.amount),
      currency: data.currency,
      frequency: data.frequency,
      splitMethod: data.splitMethod,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      groupId: selectedGroupId,
      categoryId: selectedCategoryId,
      notes: data.notes || undefined,
      participants: participants.map((p) => ({ userId: p.userId })),
    }, {
      onSuccess: () => router.dismiss(),
      onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to create'),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.dismiss()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Recurring Expense</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
          <Input label="Description *" value={value} onChangeText={onChange} placeholder="e.g. Monthly Rent" error={errors.description?.message} />
        )} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (
              <Input label="Amount *" value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount?.message} />
            )} />
          </View>
          <Controller control={control} name="currency" render={({ field: { onChange, value } }) => (
            <View style={styles.currencyPicker}>
              <Text style={styles.fieldLabel}>Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity key={c} style={[styles.currChip, value === c && styles.currChipActive]} onPress={() => onChange(c)}>
                    <Text style={[styles.currText, value === c && styles.currTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Frequency *</Text>
          <Controller control={control} name="frequency" render={({ field: { onChange, value } }) => (
            <View style={styles.freqGrid}>
              {FREQUENCIES.map((f) => (
                <TouchableOpacity key={f.value} style={[styles.freqChip, value === f.value && styles.freqChipActive]} onPress={() => onChange(f.value)}>
                  <Text style={[styles.freqLabel, value === f.value && styles.freqLabelActive]}>{f.label}</Text>
                  <Text style={[styles.freqDesc, value === f.value && styles.freqDescActive]}>{f.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Split Method</Text>
          <Controller control={control} name="splitMethod" render={({ field: { onChange, value } }) => (
            <View style={styles.methodRow}>
              {SPLIT_METHODS.map((m) => (
                <TouchableOpacity key={m} style={[styles.methodChip, value === m && styles.methodChipActive]} onPress={() => onChange(m)}>
                  <Text style={[styles.methodText, value === m && styles.methodTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )} />
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="startDate" render={({ field: { onChange, value } }) => (
              <Input label="Start Date *" value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" error={errors.startDate?.message} />
            )} />
          </View>
          <View style={{ flex: 1 }}>
            <Controller control={control} name="endDate" render={({ field: { onChange, value } }) => (
              <Input label="End Date (opt.)" value={value ?? ''} onChangeText={onChange} placeholder="YYYY-MM-DD" error={errors.endDate?.message} />
            )} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Group (optional)</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowGroupModal(true)}>
            <Text style={selectedGroupId ? styles.pickerVal : styles.pickerPlaceholder}>
              {selectedGroupId ? (groups ?? []).find((g: any) => g.id === selectedGroupId)?.name ?? 'Selected' : 'No group'}
            </Text>
            <ChevronDown size={16} color="#6b7280" />
          </TouchableOpacity>
          {selectedGroupId && (
            <TouchableOpacity onPress={() => setSelectedGroupId(undefined)}>
              <Text style={styles.clearLink}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Category (optional)</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCategoryModal(true)}>
            <Text style={selectedCategoryId ? styles.pickerVal : styles.pickerPlaceholder}>
              {selectedCategoryId ? (categoriesData ?? []).find((c: any) => c.id === selectedCategoryId)?.name ?? 'Selected' : 'No category'}
            </Text>
            <ChevronDown size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <View style={styles.participantsHeader}>
            <Text style={styles.fieldLabel}>Participants ({participants.length})</Text>
            <TouchableOpacity onPress={() => setShowParticipantModal(true)}>
              <Text style={styles.addParticipantLink}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.participantChips}>
            {participants.map((p) => (
              <View key={p.userId} style={styles.participantChip}>
                <Avatar name={p.displayName} uri={p.avatarUrl} size={24} />
                <Text style={styles.participantName}>{p.userId === user?.id ? 'You' : p.displayName}</Text>
              </View>
            ))}
          </View>
        </View>

        <Controller control={control} name="notes" render={({ field: { onChange, value } }) => (
          <Input label="Notes (optional)" value={value ?? ''} onChangeText={onChange} placeholder="Add a note..." multiline numberOfLines={2} />
        )} />

        <Button title="Create Recurring Expense" onPress={handleSubmit(onSubmit)} loading={createRecurring.isPending} style={styles.submitBtn} />
      </ScrollView>

      <Modal visible={showGroupModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGroupModal(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Group</Text>
            <TouchableOpacity onPress={() => setShowGroupModal(false)}><X size={20} color="#111827" /></TouchableOpacity>
          </View>
          <FlatList
            data={groups ?? []}
            keyExtractor={(g: any) => g.id}
            renderItem={({ item: g }: { item: any }) => (
              <TouchableOpacity style={styles.modalRow} onPress={() => { setSelectedGroupId(g.id); setShowGroupModal(false); }}>
                <Text style={styles.modalRowText}>{g.name}</Text>
                {selectedGroupId === g.id && <Check size={18} color="#6366f1" />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCategoryModal(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}><X size={20} color="#111827" /></TouchableOpacity>
          </View>
          <FlatList
            data={categoriesData ?? []}
            keyExtractor={(c: any) => c.id}
            renderItem={({ item: c }: { item: any }) => (
              <TouchableOpacity style={styles.modalRow} onPress={() => { setSelectedCategoryId(c.id); setShowCategoryModal(false); }}>
                <Text style={{ fontSize: 20 }}>{c.icon}</Text>
                <Text style={[styles.modalRowText, { flex: 1 }]}>{c.name}</Text>
                {selectedCategoryId === c.id && <Check size={18} color="#6366f1" />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={showParticipantModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowParticipantModal(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Participants</Text>
            <TouchableOpacity onPress={() => setShowParticipantModal(false)}><X size={20} color="#111827" /></TouchableOpacity>
          </View>
          <FlatList
            data={friends}
            keyExtractor={(f) => f.userId}
            renderItem={({ item: f }) => {
              const selected = participants.some((p) => p.userId === f.userId);
              return (
                <TouchableOpacity style={styles.modalRow} onPress={() => toggleParticipant(f)}>
                  <Avatar name={f.displayName} uri={f.avatarUrl} size={36} />
                  <Text style={[styles.modalRowText, { flex: 1 }]}>{f.displayName}</Text>
                  {selected && <Check size={18} color="#6366f1" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>Add friends first to include them.</Text>}
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
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 12 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  currencyPicker: { gap: 6 },
  currChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb', marginRight: 6 },
  currChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  currText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  currTextActive: { color: '#fff' },
  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb', minWidth: '30%' },
  freqChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  freqLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  freqLabelActive: { color: '#fff' },
  freqDesc: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  freqDescActive: { color: 'rgba(255,255,255,0.8)' },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  methodChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  methodText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  methodTextActive: { color: '#fff' },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  pickerVal: { fontSize: 14, color: '#111827', fontWeight: '500' },
  pickerPlaceholder: { fontSize: 14, color: '#9ca3af' },
  clearLink: { fontSize: 12, color: '#6366f1', marginTop: 4 },
  participantsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addParticipantLink: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
  participantChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  participantChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  participantName: { fontSize: 13, color: '#374151', fontWeight: '500' },
  submitBtn: { marginTop: 8 },
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  modalRowText: { fontSize: 15, color: '#111827' },
  emptyText: { padding: 24, textAlign: 'center', color: '#6b7280' },
});
