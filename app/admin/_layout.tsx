import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAdminGate } from '@/hooks/useAdminGate';
import { supabase } from '@/utils/supabase';

export default function AdminLayout() {
  const { allowed, loading, signOut } = useAdminGate();

  useEffect(() => {
    // Debug the admin claim in the current JWT
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.log('session fetch error', error);
        return;
      }
      console.log('user_type claim', data?.session?.user?.app_metadata?.user_type);
    })();
  }, []);

  if (loading) return null;

  if (!allowed) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Admin access required</Text>
        <Text style={styles.fallbackText}>
          You need an admin account to view this console.
        </Text>
        <TouchableOpacity style={[styles.fallbackButton, styles.secondary]} onPress={signOut}>
          <Text style={[styles.fallbackButtonText, styles.secondaryText]}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="metrics" />
       <Stack.Screen name="reviews" />
       <Stack.Screen name="orders" />
       <Stack.Screen name="payouts" />
       <Stack.Screen name="analytics" />
       <Stack.Screen name="settings" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  fallbackButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#111827',
    marginBottom: 10,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: '#F3F4F6',
  },
  secondaryText: {
    color: '#111827',
  },
});
