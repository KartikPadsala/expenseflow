import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Minus, ChevronDown, Check } from 'lucide-react-native';
import { useExpense, useUpdateExpense } from '../../../../hooks/use-expenses';
import { useGroups, useGroup } from '../../../../hooks/use-groups';
import { useCategories } from '../../../../hooks/use-categories';
import { useFriends } from '../../../../hooks/use-friends';
import { useAuthStore } from '../../../../store/auth.store';
import {
  getSplitAmounts,
  getMethodLabel,
  getMethodDescription,
  roundCurrency,
} from '../../../../lib/split-utils';
import type { SplitMethod } from '../../../../lib/split-utils';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Card } from '../../../../components/ui/Card';
import { Avatar } from '../../../../components/ui/Avatar';
import { Divider } from '../../../../components/ui/Divider';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { EmptyState } from '../../../../components/ui/EmptyState';

const SPLIT_METHODS: SplitMethod[] = ['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES', 'MULTI_PAYER'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CNY'];

const detailsSchema = z.object({
  description: z.string().min(1, 'Description is required').max(120),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter a valid amount > 0'),
  currency: z.string().length(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter date as YYYY-MM-DD'),
  notes: z.string().max(500).optional(),
});
type DetailsForm = z.infer<typeof detailsSchema>;

interface Participant {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

function isoDate(d: string | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const expense = useExpense(id);
  const { mutate: updateExpense, isPending } = useUpdateExpense();

  const [initialized, setInitialized] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('EQUAL');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [paidByUserId, setPaidByUserId] = useState<string>(user?.id ?? '');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});
  const [multiPayerAmounts, setMultiPayerAmounts] = useState<Record<string, string>>({});
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showPaidByPicker, setShowPaidByPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { description: '', amount: '', currency: 'USD', date: '', notes: '' },
  });

  const amount = parseFloat(watch('amount') || '0') || 0;
  const currency = watch('currency');

  const groups = useGroups();
  const group = useGroup(selectedGroupId ?? '');
  const categories = useCategories();
  const friends = useFriends();

  // Pre-fill from existing expense once loaded
  useEffect(() => {
    if (expense.data && !initialized) {
      const e = expense.data;
      reset({
        description: e.description,
        amount: String(e.amount),
        currency: e.currency,
        date: isoDate(e.date),
        notes: e.notes ?? '',
      });
      setSelectedGroupId(e.groupId ?? undefined);
      setSelectedCategoryId(e.categoryId ?? undefined);
      setSplitMethod(e.splitMethod as SplitMethod);
      setPaidByUserId(e.paidById ?? e.paidBy?.id ?? user?.id ?? '');

      const prefilled: Participant[] = (e.participants ?? []).map((p: any) => ({
        userId: p.user?.id ?? p.userId,
        displayName: p.user?.displayName ?? 'Unknown',
        avatarUrl: p.user?.avatarUrl,
      }));
      setParticipants(prefilled);

      const ca: Record<string, string> = {};
      const pct: Record<string, string> = {};
      const sh: Record<string, string> = {};
      const mp: Record<string, string> = {};
      (e.participants ?? []).forEach((p: any) => {
        const uid = p.user?.id ?? p.userId;
        ca[uid] = String(roundCurrency(p.owedAmount ?? 0));
        pct[uid] = String(p.sharePercent ?? 0);
        sh[uid] = String(p.shares ?? 1);
        mp[uid] = String(roundCurrency(p.owedAmount ?? 0));
      });
      setCustomAmounts(ca);
      setPercentages(pct);
      setShares(sh);
      setMultiPayerAmounts(mp);
      setInitialized(true);
    }
  }, [expense.data, initialized, reset]);

  const availablePeople: Participant[] = useMemo(() => {
    if (selectedGroupId && group.data?.members) {
      return group.data.members.map((m: any) => ({
        userId: m.user.id,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
      }));
    }
    const friendPeople: Participant[] = (friends.data ?? []).map((f: any) => {
      const other = f.requester?.id === user?.id ? f.addressee : f.requester;
      return { userId: other.id, displayName: other.displayName, avatarUrl: other.avatarUrl };
    });
    const me: Participant = { userId: user!.id, displayName: user!.displayName, avatarUrl: user?.avatarUrl };
    const all = [me, ...friendPeople];
    return all.filter((p, i, arr) => arr.findIndex((a) => a.userId === p.userId) === i);
  }, [selectedGroupId, group.data, friends.data, user]);

  const notYetAdded = availablePeople.filter((p) => !participants.find((a) => a.userId === p.userId));

  const addParticipant = (person: Participant) => {
    setParticipants((prev) => [...prev, person]);
    setShares((prev) => ({ ...prev, [person.userId]: '1' }));
    setShowAddParticipant(false);
  };

  const removeParticipant = (userId: string) => {
    if (participants.length <= 1) {
      Alert.alert('Cannot remove', 'At least one participant required');
      return;
    }
    setParticipants((prev) => prev.filter((p) => p.userId !== userId));
  };

  const splitPreview = useMemo(() => {
    if (amount <= 0 || participants.length === 0) return [];
    const amtsNum: Record<string, number> = {};
    const pctNum: Record<string, number> = {};
    const sharesNum: Record<string, number> = {};
    const multiNum: Record<string, number> = {};
    participants.forEach((p) => {
      amtsNum[p.userId] = parseFloat(customAmounts[p.userId] || '0') || 0;
      pctNum[p.userId] = parseFloat(percentages[p.userId] || '0') || 0;
      sharesNum[p.userId] = parseFloat(shares[p.userId] || '1') || 1;
      multiNum[p.userId] = parseFloat(multiPayerAmounts[p.userId] || '0') || 0;
    });
    const effectiveAmts = splitMethod === 'MULTI_PAYER' ? multiNum : amtsNum;
    return getSplitAmounts(amount, participants, splitMethod, effectiveAmts, pctNum, sharesNum);
  }, [amount, participants, splitMethod, customAmounts, percentages, shares, multiPayerAmounts]);

  const percentageTotal = participants.reduce((s, p) => s + (parseFloat(percentages[p.userId] || '0') || 0), 0);
  const amountTotal = participants.reduce((s, p) => s + (parseFloat(customAmounts[p.userId] || '0') || 0), 0);
  const multiTotal = participants.reduce((s, p) => s + (parseFloat(multiPayerAmounts[p.userId] || '0') || 0), 0);

  const isSplitValid = () => {
    if (amount <= 0) return false;
    switch (splitMethod) {
      case 'EQUAL': case 'SHARES': return true;
      case 'PERCENTAGE': return Math.abs(percentageTotal - 100) < 0.5;
      case 'UNEQUAL': case 'EXACT': return Math.abs(amountTotal - amount) < 0.02;
      case 'MULTI_PAYER': return Math.abs(multiTotal - amount) < 0.02;
      default: return true;
    }
  };

  const selectedCategory = (categories.data ?? []).find((c: any) => c.id === selectedCategoryId);
  const selectedGroup = (groups.data ?? []).find((g: any) => g.id === selectedGroupId);
  const paidByPerson = participants.find((p) => p.userId === paidByUserId) ?? participants[0];
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(val);

  const onSubmit = (details: DetailsForm) => {
    if (!isSplitValid()) {
      Alert.alert('Invalid Split', 'Please check your split amounts');
      return;
    }
    const parsedAmount = parseFloat(details.amount);
    const participantsPayload = participants.map((p) => {
      const base: any = { userId: p.userId };
      if (splitMethod === 'PERCENTAGE') base.sharePercent = parseFloat(percentages[p.userId] || '0') || 0;
      else if (splitMethod === 'SHARES') base.shares = parseFloat(shares[p.userId] || '1') || 1;
      else if (splitMethod === 'UNEQUAL' || splitMethod === 'EXACT') base.owedAmount = parseFloat(customAmounts[p.userId] || '0') || 0;
      else if (splitMethod === 'MULTI_PAYER') base.owedAmount = parseFloat(multiPayerAmounts[p.userId] || '0') || 0;
      return base;
    });
    updateExpense(
      {
        id,
        description: details.description,
        amount: parsedAmount,
        currency: details.currency,
        date: details.date,
        groupId: selectedGroupId,
        categoryId: selectedCategoryId,
        splitMethod,
        notes: details.notes || undefined,
        participants: participantsPayload,
      },
      {
        onSuccess: () => router.replace(`/(tabs)/expenses/${id}`),
        onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Could not update expense'),
      },
    );
  };

  if (expense.isLoading || !initialized) return <LoadingState fullScreen message="Loading expense..." />;
  if (expense.isError) return <ErrorState message="Could not load expense" onRetry={expense.refetch} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><X size={22} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Expense</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={styles.sectionTitle}>Details</Text>
          <Card style={styles.sectionCard}>
            <Controller control={control} name="description" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Description" placeholder="e.g. Dinner" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.description?.message} />
            )} />
            <View style={styles.amountRow}>
              <Controller control={control} name="amount" render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Amount" placeholder="0.00" keyboardType="decimal-pad" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.amount?.message} containerStyle={styles.amountInput} />
              )} />
              <View style={styles.currencyWrapper}>
                <Text style={styles.inputLabel}>Currency</Text>
                <TouchableOpacity style={styles.currencyBtn} onPress={() => setShowCurrencyPicker(true)}>
                  <Text style={styles.currencyText}>{currency}</Text>
                  <ChevronDown size={14} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
            <Controller control={control} name="date" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Date (YYYY-MM-DD)" placeholder="YYYY-MM-DD" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.date?.message} />
            )} />
            <Controller control={control} name="notes" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Notes (optional)" placeholder="Any additional details..." onChangeText={onChange} onBlur={onBlur} value={value ?? ''} multiline numberOfLines={2} />
            )} />
          </Card>

          <Text style={styles.sectionTitle}>Group & Category</Text>
          <Card style={styles.sectionCard}>
            <TouchableOpacity style={styles.pickerRow} onPress={() => setShowGroupPicker(true)}>
              <Text style={styles.pickerLabel}>Group</Text>
              <View style={styles.pickerValue}><Text style={styles.pickerValueText}>{selectedGroup ? selectedGroup.name : 'No group'}</Text><ChevronDown size={16} color="#9ca3af" /></View>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity style={styles.pickerRow} onPress={() => setShowCategoryPicker(true)}>
              <Text style={styles.pickerLabel}>Category</Text>
              <View style={styles.pickerValue}>
                {selectedCategory ? (<View style={styles.categoryRow}><Text style={styles.categoryEmoji}>{selectedCategory.icon}</Text><Text style={styles.pickerValueText}>{selectedCategory.name}</Text></View>) : (<Text style={styles.pickerValueText}>None</Text>)}
                <ChevronDown size={16} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          </Card>

          {splitMethod !== 'MULTI_PAYER' && (
            <>
              <Text style={styles.sectionTitle}>Paid By</Text>
              <Card style={styles.sectionCard}>
                <TouchableOpacity style={styles.pickerRow} onPress={() => setShowPaidByPicker(true)}>
                  <View style={styles.paidByLeft}><Avatar name={paidByPerson?.displayName} uri={paidByPerson?.avatarUrl} size="sm" /><Text style={styles.pickerValueText}>{paidByPerson?.displayName ?? 'Select'}</Text></View>
                  <ChevronDown size={16} color="#9ca3af" />
                </TouchableOpacity>
              </Card>
            </>
          )}

          <Text style={styles.sectionTitle}>Split Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodScroll} contentContainerStyle={styles.methodScrollContent}>
            {SPLIT_METHODS.map((m) => (
              <TouchableOpacity key={m} style={[styles.methodBtn, splitMethod === m && styles.methodBtnActive]} onPress={() => setSplitMethod(m)}>
                <Text style={[styles.methodBtnText, splitMethod === m && styles.methodBtnTextActive]}>{getMethodLabel(m)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.methodDesc}>{getMethodDescription(splitMethod)}</Text>

          <View style={styles.participantsHeader}>
            <Text style={styles.sectionTitle}>{splitMethod === 'MULTI_PAYER' ? 'Payers' : 'Split Between'}</Text>
            <TouchableOpacity style={styles.addParticipantBtn} onPress={() => setShowAddParticipant(true)}>
              <Plus size={16} color="#22c55e" />
              <Text style={styles.addParticipantText}>Add</Text>
            </TouchableOpacity>
          </View>

          {participants.map((p) => (
            <Card key={p.userId} style={styles.participantCard}>
              <View style={styles.participantRow}>
                <Avatar name={p.displayName} uri={p.avatarUrl} size="sm" />
                <Text style={styles.participantName}>{p.displayName}</Text>
                {participants.length > 1 && (<TouchableOpacity onPress={() => removeParticipant(p.userId)} style={styles.removeBtn}><Minus size={14} color="#9ca3af" /></TouchableOpacity>)}
              </View>
              {(splitMethod === 'UNEQUAL' || splitMethod === 'EXACT') && (
                <TextInput style={styles.participantInput} value={customAmounts[p.userId] ?? ''} onChangeText={(v) => setCustomAmounts((prev) => ({ ...prev, [p.userId]: v }))} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />
              )}
              {splitMethod === 'PERCENTAGE' && (
                <View style={styles.participantInputRow}>
                  <TextInput style={styles.participantInput} value={percentages[p.userId] ?? ''} onChangeText={(v) => setPercentages((prev) => ({ ...prev, [p.userId]: v }))} placeholder="0" keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />
                  <Text style={styles.inputSuffix}>%</Text>
                </View>
              )}
              {splitMethod === 'SHARES' && (
                <View style={styles.participantInputRow}>
                  <TextInput style={styles.participantInput} value={shares[p.userId] ?? '1'} onChangeText={(v) => setShares((prev) => ({ ...prev, [p.userId]: v }))} placeholder="1" keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />
                  <Text style={styles.inputSuffix}>shares</Text>
                </View>
              )}
              {splitMethod === 'MULTI_PAYER' && (
                <TextInput style={styles.participantInput} value={multiPayerAmounts[p.userId] ?? ''} onChangeText={(v) => setMultiPayerAmounts((prev) => ({ ...prev, [p.userId]: v }))} placeholder="Amount paid" keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />
              )}
            </Card>
          ))}

          {splitMethod === 'PERCENTAGE' && (
            <Text style={[styles.validationHint, Math.abs(percentageTotal - 100) < 0.5 ? styles.validGreen : styles.validRed]}>
              Total: {percentageTotal.toFixed(1)}% {Math.abs(percentageTotal - 100) < 0.5 ? '✓' : '(needs 100%)'}
            </Text>
          )}
          {(splitMethod === 'UNEQUAL' || splitMethod === 'EXACT') && amount > 0 && (
            <Text style={[styles.validationHint, Math.abs(amountTotal - amount) < 0.02 ? styles.validGreen : styles.validRed]}>
              Total: {formatCurrency(amountTotal)} / {formatCurrency(amount)}
            </Text>
          )}
          {splitMethod === 'MULTI_PAYER' && amount > 0 && (
            <Text style={[styles.validationHint, Math.abs(multiTotal - amount) < 0.02 ? styles.validGreen : styles.validRed]}>
              Total paid: {formatCurrency(multiTotal)} / {formatCurrency(amount)}
            </Text>
          )}

          {splitPreview.length > 0 && amount > 0 && (
            <>
              <Text style={styles.sectionTitle}>Split Preview</Text>
              <Card>
                {splitPreview.map((sp, i) => (
                  <View key={sp.userId}>
                    <View style={styles.previewRow}>
                      <Avatar name={sp.displayName} uri={sp.avatarUrl} size="xs" />
                      <Text style={styles.previewName}>{sp.displayName}</Text>
                      <Text style={styles.previewAmount}>{formatCurrency(sp.owedAmount)}</Text>
                      <Text style={styles.previewPct}>{sp.sharePercent.toFixed(1)}%</Text>
                    </View>
                    {i < splitPreview.length - 1 && <Divider />}
                  </View>
                ))}
              </Card>
            </>
          )}

          <Button onPress={handleSubmit(onSubmit)} loading={isPending} fullWidth style={styles.submitBtn}>
            Save Changes
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pickers */}
      <Modal visible={showCurrencyPicker} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Currency</Text><TouchableOpacity onPress={() => setShowCurrencyPicker(false)}><X size={20} color="#6b7280" /></TouchableOpacity></View>
          <FlatList data={CURRENCIES} keyExtractor={(c) => c} renderItem={({ item }) => (
            <Controller control={control} name="currency" render={({ field: { onChange, value } }) => (
              <TouchableOpacity style={styles.listItem} onPress={() => { onChange(item); setShowCurrencyPicker(false); }}>
                <Text style={styles.listItemText}>{item}</Text>{value === item && <Check size={16} color="#22c55e" />}
              </TouchableOpacity>
            )} />
          )} />
        </SafeAreaView>
      </Modal>

      <Modal visible={showGroupPicker} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Group</Text><TouchableOpacity onPress={() => setShowGroupPicker(false)}><X size={20} color="#6b7280" /></TouchableOpacity></View>
          <FlatList data={[{ id: null, name: 'No group' }, ...(groups.data ?? [])]} keyExtractor={(g: any) => g.id ?? 'none'} renderItem={({ item }: { item: any }) => (
            <TouchableOpacity style={styles.listItem} onPress={() => { setSelectedGroupId(item.id ?? undefined); setShowGroupPicker(false); }}>
              <Text style={styles.listItemText}>{item.name}</Text>{selectedGroupId === item.id && <Check size={16} color="#22c55e" />}
            </TouchableOpacity>
          )} />
        </SafeAreaView>
      </Modal>

      <Modal visible={showCategoryPicker} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Category</Text><TouchableOpacity onPress={() => setShowCategoryPicker(false)}><X size={20} color="#6b7280" /></TouchableOpacity></View>
          <FlatList data={[{ id: null, name: 'No category', icon: '🏷️' }, ...(categories.data ?? [])]} keyExtractor={(c: any) => c.id ?? 'none'} renderItem={({ item }: { item: any }) => (
            <TouchableOpacity style={styles.listItem} onPress={() => { setSelectedCategoryId(item.id ?? undefined); setShowCategoryPicker(false); }}>
              <Text style={styles.listItemEmoji}>{item.icon}</Text><Text style={styles.listItemText}>{item.name}</Text>{selectedCategoryId === item.id && <Check size={16} color="#22c55e" />}
            </TouchableOpacity>
          )} />
        </SafeAreaView>
      </Modal>

      <Modal visible={showPaidByPicker} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Paid By</Text><TouchableOpacity onPress={() => setShowPaidByPicker(false)}><X size={20} color="#6b7280" /></TouchableOpacity></View>
          <FlatList data={participants} keyExtractor={(p) => p.userId} renderItem={({ item }) => (
            <TouchableOpacity style={styles.listItem} onPress={() => { setPaidByUserId(item.userId); setShowPaidByPicker(false); }}>
              <Avatar name={item.displayName} uri={item.avatarUrl} size="sm" /><Text style={[styles.listItemText, { marginLeft: 8 }]}>{item.displayName}</Text>{paidByUserId === item.userId && <Check size={16} color="#22c55e" />}
            </TouchableOpacity>
          )} />
        </SafeAreaView>
      </Modal>

      <Modal visible={showAddParticipant} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add Participant</Text><TouchableOpacity onPress={() => setShowAddParticipant(false)}><X size={20} color="#6b7280" /></TouchableOpacity></View>
          {notYetAdded.length === 0 ? (<EmptyState emoji="👥" title="No more people to add" />) : (
            <FlatList data={notYetAdded} keyExtractor={(p) => p.userId} renderItem={({ item }) => (
              <TouchableOpacity style={styles.listItem} onPress={() => addParticipant(item)}>
                <Avatar name={item.displayName} uri={item.avatarUrl} size="sm" /><Text style={[styles.listItemText, { marginLeft: 8 }]}>{item.displayName}</Text><Plus size={16} color="#22c55e" />
              </TouchableOpacity>
            )} />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 16, paddingBottom: 40, gap: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  sectionCard: { marginBottom: 0, padding: 16, gap: 14 },
  amountRow: { flexDirection: 'row', gap: 10 },
  amountInput: { flex: 1 },
  currencyWrapper: { width: 90, gap: 6 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  currencyBtn: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  currencyText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  pickerLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  pickerValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pickerValueText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryEmoji: { fontSize: 16 },
  paidByLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  methodScroll: { marginVertical: 4 },
  methodScrollContent: { gap: 8, paddingVertical: 4 },
  methodBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent' },
  methodBtnActive: { backgroundColor: '#dcfce7', borderColor: '#22c55e' },
  methodBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  methodBtnTextActive: { color: '#16a34a', fontWeight: '600' },
  methodDesc: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  participantsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 },
  addParticipantBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addParticipantText: { fontSize: 14, color: '#22c55e', fontWeight: '600' },
  participantCard: { marginBottom: 8, padding: 12, gap: 10 },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  participantName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  removeBtn: { padding: 4 },
  participantInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  participantInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputSuffix: { fontSize: 13, color: '#9ca3af', width: 40 },
  validationHint: { fontSize: 12, fontWeight: '500', marginTop: 2, marginBottom: 8 },
  validGreen: { color: '#16a34a' },
  validRed: { color: '#ef4444' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  previewName: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  previewAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  previewPct: { fontSize: 12, color: '#9ca3af', width: 40, textAlign: 'right' },
  submitBtn: { marginTop: 16 },
  modal: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb', gap: 12 },
  listItemEmoji: { fontSize: 20 },
  listItemText: { flex: 1, fontSize: 15, color: '#111827' },
});
