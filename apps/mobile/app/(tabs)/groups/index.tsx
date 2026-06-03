import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGroups } from '../../../hooks/use-groups';
import { Card } from '../../../components/ui/Card';
import { GROUP_TYPES } from '@expenseflow/shared';
import { Plus } from 'lucide-react-native';

export default function GroupsScreen() {
  const { data: groups, isLoading } = useGroups();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/(tabs)/groups/new')}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: group }) => {
          const type = GROUP_TYPES.find((t) => t.value === group.type);
          return (
            <TouchableOpacity onPress={() => router.push(`/(tabs)/groups/${group.id}`)}>
              <Card>
                <View style={styles.groupRow}>
                  <Text style={styles.groupIcon}>{type?.icon || '👥'}</Text>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupMeta}>{group.members?.length || 0} members · {group.currency}</Text>
                  </View>
                  <Text style={styles.groupExpenses}>{group._count?.expenses || 0} exp.</Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No groups yet. Create one!</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  fab: { backgroundColor: '#22c55e', borderRadius: 20, padding: 8 },
  list: { padding: 16, paddingTop: 0 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupIcon: { fontSize: 28 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  groupMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  groupExpenses: { fontSize: 12, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 15 },
});
