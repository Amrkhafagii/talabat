import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { LayoutDashboard, BookOpen, Receipt, Settings, BarChart3 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from 'react-native';
import { fetchInstapayStatus } from '@/utils/instapayCheck';

export default function RestaurantLayout() {
  const { user, userType, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      // Redirect non-restaurant users to their appropriate dashboard
      if (userType !== 'restaurant') {
        switch (userType) {
          case 'customer':
            router.replace('/(tabs)/customer');
            break;
          case 'delivery':
            router.replace('/(tabs)/delivery');
            break;
          default:
            // If userType is not recognized, redirect to login
            router.replace('/(auth)/login');
            break;
        }
      }
    } else if (!loading && !user) {
      // Redirect unauthenticated users to login
      router.replace('/(auth)/login');
    }
  }, [user, userType, loading]);

  useEffect(() => {
    const guard = async () => {
      if (!loading && user && userType === 'restaurant') {
        const ok = await fetchInstapayStatus(user.id, 'restaurant');
        if (!ok) {
          Alert.alert(
            'Instapay required',
            'Add your Instapay handle to receive payouts.',
            [
              { text: 'Go to wallet', onPress: () => router.push('/(tabs)/restaurant/wallet' as any) },
              { text: 'Cancel', style: 'cancel' }
            ],
            { cancelable: false }
          );
        }
      }
    };
    guard();
  }, [loading, user, userType]);

  // Don't render anything while checking authentication or if user is not a restaurant
  if (loading || !user || userType !== 'restaurant') {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter-Medium',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ size, color }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: 'Metrics',
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ size, color }) => (
            <Receipt size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
      
      {/* Non-tab screens - these won't appear in the tab bar */}
      <Tabs.Screen
        name="add-menu-item"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-menu-item"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
