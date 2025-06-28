import { Tabs, router } from 'expo-router';
import { User, Store, Truck } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function TabLayout() {
  const { user, userType, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/welcome');
    }
  }, [user, loading]);

  if (loading || !user || !userType) {
    return null;
  }

  // Show only the relevant tab based on user type
  const getTabScreens = () => {
    switch (userType) {
      case 'customer':
        return (
          <Tabs.Screen
            name="customer"
            options={{
              title: 'Customer',
              tabBarIcon: ({ size, color }) => (
                <User size={size} color={color} />
              ),
            }}
          />
        );
      case 'restaurant':
        return (
          <Tabs.Screen
            name="restaurant"
            options={{
              title: 'Restaurant',
              tabBarIcon: ({ size, color }) => (
                <Store size={size} color={color} />
              ),
            }}
          />
        );
      case 'delivery':
        return (
          <Tabs.Screen
            name="delivery"
            options={{
              title: 'Delivery',
              tabBarIcon: ({ size, color }) => (
                <Truck size={size} color={color} />
              ),
            }}
          />
        );
      default:
        return null;
    }
  };

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
      {getTabScreens()}
    </Tabs>
  );
}