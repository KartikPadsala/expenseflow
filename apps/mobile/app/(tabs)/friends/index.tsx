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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus, X, Search, Check, UserMinus } from 'lucide-react-native';
import {
  useFriends,
  useFriendRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useUserSearch,
} from '../../../hooks/use-friends';
import { useAuthStore } from '../../../store/auth.store';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';

function formatCurrency(amount: number) {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(abs);
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

export default function FriendsScreen() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendFilter, setFriendFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  const friends = useFriends();
  const requests = useFriendRequests();
  const { data: userResults, isFetching: searching } = useUserSearch(searchQuery);

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['friends'] }),
    ]);
    setRefreshing(false);
  }, [qc]);

  const handleSendRequest = (userId: string, name: string) => {
    sendRequest.mutate(userId, {
      onSuccess: () => {
        Alert.alert('Request Sent', `Friend request sent to ${name}`);
      },
      onError: (err: any) => {
        Alert.alert('Error', err?.response?.data?.message ?? 'Could not send request');
      },
    });
  };

  const handleRemoveFriend = (id: string, name: string) => {
    Alert.alert('Remove Friend', `Remove ${name} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeFriend.mutate(id),
      },
    ]);
  };

  const filteredFriends = (friends.data ?? []).filter((f: any) => {
    const other = f.requester?.id === user?.id ? f.addressee : f.requester;
    return (other?.displayName ?? '').toLowerCase().includes(friendFilter.toLowerCase()) ||
      (other?.username ?? '').toLowerCase().includes(friendFilter.toLowerCase());
  });

  const pendingCount = (requests.data ?? []).length;

  if (friends.isLoading) return <LoadingState fullScreen message="Loading friends..." />;
  if (friends.isError) return <ErrorState message={(friends.error as any)?.message} onRetry={friends.refetch} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <UserPlus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends ({(friends.data ?? []).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Text>
          {pendingCount > 0 && <View style={styles.requestDot} />}
        </TouchableOpacity>
      </View>

      {activeTab === 'friends' && (
        <>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={15} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                value={friendFilter}
                onChangeText={setFriendFilter}
                placeholder="Search friends..."
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
          >
            {filteredFriends.length === 0 ? (
              <EmptyState
                emoji="👫"
                title={friendFilter ? 'No friends found' : 'No friends yet'}
                message={!friendFilter ? 'Add friends to start splitting expenses together' : undefined}
                actionLabel={!friendFilter ? 'Add Friend' : undefined}
                onAction={!friendFilter ? () => setShowAddModal(true) : undefined}
              />
            ) : (
              filteredFriends.map((f: any) => {
                const other = f.requester?.id === user?.id ? f.addressee : f.requester;
                return (
                  <Card key={f.id} style={styles.friendCard}>
                    <View style={styles.friendRow}>
                      <Avatar name={other?.displayName} uri={other?.avatarUrl} size="md" />
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{other?.displayName ?? 'Unknown'}</Text>
                        <Text style={styles.friendUsername}>@{other?.username ?? ''}</Text>
                      </View>
                      {f.balance != null && f.balance !== 0 && (
                        <Badge variant={f.balance > 0 ? 'success' : 'danger'}>
                          {f.balance > 0 ? 'owed' : 'owes'} {formatCurrency(f.balance)}
                        </Badge>
                      )}
                      <TouchableOpacity
                        onPress={() => handleRemoveFriend(f.id, other?.displayName ?? 'friend')}
                        style={styles.removeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <UserMinus size={16} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      {activeTab === 'requests' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
        >
          {(requests.data ?? []).length === 0 ? (
            <EmptyState emoji="📬" title="No pending requests" message="Friend requests you receive will show here" />
          ) : (
            (requests.data ?? []).map((r: any) => {
              const sender = r.requester;
              return (
                <Card key={r.id} style={styles.friendCard}>
                  <View style={styles.friendRow}>
                    <Avatar name={sender?.displayName} uri={sender?.avatarUrl} size="md" />
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{sender?.displayName ?? 'Unknown'}</Text>
                      <Text style={styles.friendUsername}>@{sender?.username ?? ''}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        onPress={() => acceptRequest.mutate(r.id)}
                        style={styles.acceptBtn}
                      >
                        <Check size={16} color="#ffffff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => declineRequest.mutate(r.id)}
                        style={styles.declineBtn}
                      >
                        <X size={16} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add Friend Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <TouchableOpacity onPress={() => { setShowAddModal(false); setSearchQuery(''); }}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchRow}>
            <View style={styles.modalSearchBox}>
              <Search size={16} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name or username..."
                placeholderTextColor="#9ca3af"
                autoFocus
              />
              {searching && <ActivityIndicator size="small" color="#22c55e" />}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {searchQuery.length < 2 ? (
              <EmptyState emoji="🔍" title="Search for friends" message="Enter at least 2 characters to search" />
            ) : (userResults ?? []).length === 0 && !searching ? (
              <EmptyState emoji="😕" title="No users found" message="Try a different name or username" />
            ) : (
              (userResults ?? []).filter((u: any) => u.id !== user?.id).map((u: any) => (
                <Card key={u.id} style={styles.friendCard}>
                  <View style={styles.friendRow}>
                    <Avatar name={u.displayName} uri={u.avatarUrl} size="md" />
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{u.displayName}</Text>
                      <Text style={styles.friendUsername}>@{u.username}</Text>
                    </View>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => handleSendRequest(u.id, u.displayName)}
                      loading={sendRequest.isPending && sendRequest.variables === u.id}
                    >
                      Add
                    </Button>
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
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
  tabs: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#22c55e' },
  tabText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  tabTextActive: { color: '#22c55e', fontWeight: '600' },
  requestDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  searchRow: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  friendCard: { marginBottom: 10 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  friendUsername: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  declineBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  removeBtn: { padding: 4 },
  modal: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalSearchRow: { padding: 16 },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12, height: 44, gap: 8 },
  modalContent: { padding: 16, paddingTop: 0, paddingBottom: 32 },
});
