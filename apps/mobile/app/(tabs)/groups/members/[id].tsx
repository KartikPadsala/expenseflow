import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react-native';
import { useGroup, useAddGroupMember, useRemoveGroupMember } from '../../../../hooks/use-groups';
import { useAuthStore } from '../../../../store/auth.store';
import { Avatar } from '../../../../components/ui/Avatar';
import { Badge } from '../../../../components/ui/Badge';

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const group = useGroup(id);
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const [showAddModal, setShowAddModal] = useState(false);
  const [userId, setUserId] = useState('');

  const members: any[] = group.data?.members ?? [];
  const isAdminOrOwner = members.find((m) => m.userId === user?.id && ['OWNER', 'ADMIN'].includes(m.role));

  function handleAdd() {
    if (!userId.trim()) return;
    addMember.mutate({ groupId: id, userId: userId.trim() }, {
      onSuccess: () => { setUserId(''); setShowAddModal(false); },
      onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to add member'),
    });
  }

  function handleRemove(memberId: string, name: string) {
    Alert.alert('Remove Member', `Remove ${name} from the group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: () => {
          removeMember.mutate({ groupId: id, memberId }, {
            onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to remove'),
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
        <Text style={styles.headerTitle}>Members ({members.length})</Text>
        {isAdminOrOwner ? (
          <TouchableOpacity onPress={() => setShowAddModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <UserPlus size={22} color="#6366f1" />
          </TouchableOpacity>
        ) : <View style={{ width: 22 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {members.map((m: any) => {
          const isSelf = m.userId === user?.id;
          const canRemove = isAdminOrOwner && !isSelf && m.role !== 'OWNER';
          return (
            <View key={m.id} style={styles.memberRow}>
              <Avatar name={m.user?.displayName} uri={m.user?.avatarUrl} size="md" />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{isSelf ? 'You' : m.user?.displayName}</Text>
                <Text style={styles.memberEmail}>{m.user?.username ?? m.user?.email ?? ''}</Text>
              </View>
              <Badge variant={m.role === 'OWNER' ? 'primary' : m.role === 'ADMIN' ? 'warning' : 'default'}>
                {m.role}
              </Badge>
              {canRemove && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(m.userId, m.user?.displayName ?? 'member')}>
                  <Trash2 size={16} color="#dc2626" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <Text style={styles.modalSubtitle}>Enter the user ID of the person to add</Text>
            <TextInput
              style={styles.modalInput}
              value={userId}
              onChangeText={setUserId}
              placeholder="User ID"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); setUserId(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={addMember.isPending}>
                {addMember.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.addBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  memberEmail: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  removeBtn: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  addBtn: {
    flex: 1, backgroundColor: '#6366f1', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
});
