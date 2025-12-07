import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { LayoutDashboard, BookOpen, Receipt, Settings, Wallet } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from 'react-native';
import { fetchInstapayStatus } from '@/utils/instapayCheck';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function RestaurantLayout() {
  const { user, userType, loading } = useAuth();
  const theme = useRestaurantTheme();

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
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.insets.bottom + theme.spacing.sm,
          height: 72 + theme.insets.bottom,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter-SemiBold',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <LayoutDashboard size={size} color={color} strokeWidth={theme.icons.strokeWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ size, color }) => (
            <Receipt size={size} color={color} strokeWidth={theme.icons.strokeWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ size, color }) => (
            <BookOpen size={size} color={color} strokeWidth={theme.icons.strokeWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ size, color }) => (
            <Wallet size={size} color={color} strokeWidth={theme.icons.strokeWidth} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} strokeWidth={theme.icons.strokeWidth} />
          ),
        }}
      />
      
      {/* Hidden stack destinations */}
      <Tabs.Screen
        name="metrics"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="order-detail/[orderId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="payout-confirm"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="kyc/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="kyc/[step]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="category-manager"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="menu-item/add"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="menu-item/edit"
        options={{
          href: null,
        }}
      />
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
    </Tabs>
  );
}
