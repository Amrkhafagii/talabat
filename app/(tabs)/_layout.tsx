import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { user, userType, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && userType === 'admin') {
      router.replace('/admin/metrics');
    }
  }, [loading, user, userType]);

  // Return null while loading or during redirects
  if (loading || !user || !userType) {
    return null;
  }

  if (userType === 'admin') {
    return null;
  }

  // This layout now acts as a router to role-specific tab groups
  // Each role will have its own nested tab structure
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {userType === 'customer' && (
        <Tabs.Screen
          name="customer"
          options={{
            href: '/customer',
            tabBarStyle: { display: 'none' }, // Hide this level's tab bar
          }}
        />
      )}
      {userType === 'restaurant' && (
        <Tabs.Screen
          name="restaurant"
          options={{
            href: '/restaurant',
            tabBarStyle: { display: 'none' }, // Hide this level's tab bar
          }}
        />
      )}
      {userType === 'delivery' && (
        <Tabs.Screen
          name="delivery"
          options={{
            href: '/delivery',
            tabBarStyle: { display: 'none' }, // Hide this level's tab bar
          }}
        />
      )}
    </Tabs>
  );
}
