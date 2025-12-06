import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { LayoutDashboard, History, DollarSign, User, Wallet } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from 'react-native';
import { fetchInstapayStatus } from '@/utils/instapayCheck';

export default function DeliveryLayout() {
  const { user, userType, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      // Redirect non-delivery users to their appropriate dashboard
      if (userType !== 'delivery') {
        switch (userType) {
          case 'customer':
            router.replace('/(tabs)/customer');
            break;
          case 'restaurant':
            router.replace('/(tabs)/restaurant');
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
      if (!loading && user && userType === 'delivery') {
        const ok = await fetchInstapayStatus(user.id, 'delivery');
        if (!ok) {
          Alert.alert(
            'Instapay required',
            'Add your Instapay handle to receive payouts.',
            [
              { text: 'Go to profile', onPress: () => router.push('/(tabs)/delivery/profile' as any) },
              { text: 'Cancel', style: 'cancel' }
            ],
            { cancelable: false }
          );
        }
      }
    };
    guard();
  }, [loading, user, userType]);

  // Don't render anything while checking authentication or if user is not a delivery driver
  if (loading || !user || userType !== 'delivery') {
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
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ size, color }) => (
            <History size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ size, color }) => (
            <DollarSign size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ size, color }) => (
            <Wallet size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
      
      {/* Non-tab screens - these won't appear in the tab bar */}
      <Tabs.Screen
        name="location"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="navigation"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
