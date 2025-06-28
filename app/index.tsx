import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { user, loading, userType } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user && userType) {
        // User is authenticated, redirect to appropriate tab based on user type
        router.replace('/(tabs)');
      } else {
        // User is not authenticated, redirect to welcome screen
        router.replace('/(auth)/welcome');
      }
    }
  }, [user, loading, userType]);

  // Show loading spinner while checking authentication
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});