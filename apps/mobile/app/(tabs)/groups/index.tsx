import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, Search, X } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGroups, useCreateGroup } from '../../../hooks/use-groups';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';

const GROUP_TYPES = ['TRIP', 'HOME', 'COUPLE', 'OTHER'] as const;

const createGroupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').max(60),
  type: z.enum(GROUP_TYPES),
  description: z.string().max(200).optional(),
  currency: z.string().length(3).default('USD'),
});
type CreateGroupForm = z.infer<typeof createGroupSchema>;

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Math.abs(amount));
}

const GROUP_ICONS: Record<string, string> = { TRIP: '✈️', HOME: '🏠', COUPLE: '💑', OTHER: '👥' };

export default function GroupsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: groups, isLoading, isError, error, refetch } = useGroups();
  const { mutate: createGroup, isPending: creating } = useCreateGroup();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '', type: 'OTHER', description: '', currency: 'USD' },
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['groups'] });
    setRefreshing(false);
  }, [qc]);

  const filtered = (groups ?? []).filter((g: any) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const onCreateGroup = (data: CreateGroupForm) => {
    createGroup(data, {
      onSuccess: (newGroup: any) => {
        setShowCreate(false);
        reset();
        router.push(`/(tabs)/groups/${newGroup.id}`);
      },
      onError: (err: any) => {
        Alert.alert('Error', err?.response?.data?.message ?? 'Could not create group');
      },
    });
  };

  if (isLoading) return <LoadingState fullScreen message="Loading groups..." />;
  if (isError) return <ErrorState message={(error as any)?.message} onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.addBtn}>
          <Plus size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search groups..."
            placeholderTextColor="#9ca3af"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <EmptyState
            emoji="👥"
            title={search ? 'No groups found' : 'No groups yet'}
            message={search ? 'Try a different search term' : 'Create a group to start splitting expenses'}
            actionLabel={!search ? 'Create Group' : undefined}
            onAction={!search ? () => setShowCreate(true) : undefined}
          />
        ) : (
          filtered.map((group: any) => (
            <TouchableOpacity
              key={group.id}
              onPress={() => router.push(`/(tabs)/groups/${group.id}`)}
              activeOpacity={0.8}
            >
              <Card style={styles.groupCard}>
                <View style={styles.groupRow}>
                  <View style={styles.groupIconWrapper}>
                    <Text style={styles.groupIcon}>{GROUP_ICONS[group.type] ?? '👥'}</Text>
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupMeta}>
                      {group.memberCount ?? 0} member{(group.memberCount ?? 0) !== 1 ? 's' : ''} · {group.expenseCount ?? 0} expense{(group.expenseCount ?? 0) !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.groupRight}>
                    {group.myBalance != null && group.myBalance !== 0 && (
                      <Badge variant={group.myBalance > 0 ? 'success' : 'danger'}>
                        {group.myBalance > 0 ? '+' : ''}{formatCurrency(group.myBalance, group.currency)}
                      </Badge>
                    )}
                    <ChevronRight size={18} color="#d1d5db" />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Group</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); reset(); }}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Group Name"
                    placeholder="e.g. Summer Trip 2024"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    error={errors.name?.message}
                  />
                )}
              />

              <View style={styles.typeRow}>
                <Text style={styles.typeLabel}>Type</Text>
                <Controller
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.typeButtons}>
                      {GROUP_TYPES.map((t) => (
                        <TouchableOpacity
                          key={t}
                          onPress={() => onChange(t)}
                          style={[styles.typeBtn, value === t && styles.typeBtnActive]}
                        >
                          <Text style={styles.typeEmoji}>{GROUP_ICONS[t]}</Text>
                          <Text style={[styles.typeBtnText, value === t && styles.typeBtnTextActive]}>
                            {t.charAt(0) + t.slice(1).toLowerCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                />
              </View>

              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Description (optional)"
                    placeholder="What is this group for?"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    multiline
                    numberOfLines={3}
                  />
                )}
              />

              <Controller
                control={control}
                name="currency"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Default Currency"
                    placeholder="USD"
                    autoCapitalize="characters"
                    maxLength={3}
                    onChangeText={(v) => onChange(v.toUpperCase())}
                    onBlur={onBlur}
                    value={value}
                    error={errors.currency?.message}
                  />
                )}
              />

              <Button
                onPress={handleSubmit(onCreateGroup)}
                loading={creating}
                fullWidth
                style={styles.createBtn}
              >
                Create Group
              </Button>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#22c55e', borderRadius: 10, padding: 8 },
  searchRow: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  groupCard: { marginBottom: 10 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupIconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  groupIcon: { fontSize: 22 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  groupMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  groupRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Modal
  modal: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalContent: { padding: 20, gap: 16 },
  typeLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  typeRow: {},
  typeButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  typeBtnActive: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  typeEmoji: { fontSize: 16 },
  typeBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  typeBtnTextActive: { color: '#16a34a' },
  createBtn: { marginTop: 8 },
});
