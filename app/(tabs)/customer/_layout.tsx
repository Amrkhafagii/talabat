import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Chrome as Home, ShoppingCart, Receipt, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerLayout() {
  const { user, userType, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      // Redirect non-customer users to their appropriate dashboard
      if (userType !== 'customer') {
        switch (userType) {
          case 'restaurant':
            router.replace('/(tabs)/restaurant');
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

  // Don't render anything while checking authentication or if user is not a customer
  if (loading || !user || userType !== 'customer') {
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
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ size, color }) => (
            <ShoppingCart size={size} color={color} />
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
        name="restaurant"
        options={{
          href: null, // This removes it from the tab bar
        }}
      />
      <Tabs.Screen
        name="filters"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="addresses"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="add-address"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-address"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="select-address"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="track-order"
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
