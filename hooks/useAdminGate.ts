import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export function useAdminGate() {
  const { user, userType, loading, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (userType !== 'admin') {
      router.replace('/(auth)/login');
    }
  }, [loading, user, userType]);

  return {
    loading,
    allowed: Boolean(user && userType === 'admin'),
    signOut,
    user,
  };
}
