import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useGroup, useUpdateGroup, useArchiveGroup, useDeleteGroup } from '../../../../hooks/use-groups';
import { useAuthStore } from '../../../../store/auth.store';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const group = useGroup(id);
  const updateGroup = useUpdateGroup();
  const archiveGroup = useArchiveGroup();
  const deleteGroup = useDeleteGroup();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (group.data) {
      setName(group.data.name ?? '');
      setDescription(group.data.description ?? '');
      setCurrency(group.data.currency ?? 'USD');
    }
  }, [group.data]);

  const isOwner = group.data?.members?.find((m: any) => m.userId === user?.id)?.role === 'OWNER';

  function handleSave() {
    if (!name.trim() || name.length < 2) {
      Alert.alert('Error', 'Group name must be at least 2 characters');
      return;
    }
    updateGroup.mutate({ id, name: name.trim(), description: description.trim(), currency }, {
      onSuccess: () => { Alert.alert('Success', 'Group updated'); router.back(); },
      onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to update'),
    });
  }

  function handleArchive() {
    Alert.alert('Archive Group', 'Are you sure you want to archive this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', style: 'destructive', onPress: () => {
          archiveGroup.mutate(id, {
            onSuccess: () => { Alert.alert('Archived', 'Group has been archived'); router.replace('/(tabs)/groups'); },
            onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to archive'),
          });
        },
      },
    ]);
  }

  function handleDelete() {
    Alert.alert('Delete Group', 'This action cannot be undone. Delete this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          deleteGroup.mutate(id, {
            onSuccess: () => router.replace('/(tabs)/groups'),
            onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to delete'),
          });
        },
      },
    ]);
  }

  if (group.isLoading) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ActivityIndicator style={{ flex: 1 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Group</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.label}>Group Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Group name" placeholderTextColor="#9ca3af" />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyRow}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.currencyChip, currency === c && styles.currencyChipActive]}
                onPress={() => setCurrency(c)}
              >
                <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={updateGroup.isPending}>
          {updateGroup.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        {isOwner && (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Danger Zone</Text>
            <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive} disabled={archiveGroup.isPending}>
              <Text style={styles.archiveBtnText}>Archive Group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleteGroup.isPending}>
              <Text style={styles.deleteBtnText}>Delete Group</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    backgroundColor: '#fff', color: '#111827',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  currencyRow: { flexDirection: 'row' },
  currencyChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#d1d5db', marginRight: 8, backgroundColor: '#fff',
  },
  currencyChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  currencyText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  currencyTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#6366f1', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 8, marginBottom: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dangerZone: {
    borderWidth: 1, borderColor: '#fca5a5', borderRadius: 12, padding: 16,
  },
  dangerTitle: { fontSize: 15, fontWeight: '700', color: '#dc2626', marginBottom: 12 },
  archiveBtn: {
    borderWidth: 1, borderColor: '#fbbf24', borderRadius: 8, paddingVertical: 12,
    alignItems: 'center', marginBottom: 10,
  },
  archiveBtnText: { color: '#d97706', fontWeight: '600' },
  deleteBtn: {
    borderWidth: 1, borderColor: '#fca5a5', borderRadius: 8, paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#dc2626', fontWeight: '600' },
});
