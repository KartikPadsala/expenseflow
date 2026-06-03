import { Tabs, Redirect } from 'expo-router';
import { LayoutDashboard, Users, Receipt, PieChart, User, UserPlus, HandCoins } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth.store';

export default function TabsLayout() {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#e5e7eb' },
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: 'Groups', tabBarIcon: ({ color }) => <Users size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="expenses/index"
        options={{ title: 'Expenses', tabBarIcon: ({ color }) => <Receipt size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="settlements"
        options={{
          title: 'Settle',
          tabBarIcon: ({ color, size }) => <HandCoins size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{ title: 'Friends', tabBarIcon: ({ color }) => <UserPlus size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="analytics/index"
        options={{ title: 'Analytics', tabBarIcon: ({ color }) => <PieChart size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}
