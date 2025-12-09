import React, { useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminGate } from '@/hooks/useAdminGate';
import { supabase } from '@/utils/supabase';
import { useAppTheme, type AppTheme } from '@/styles/appTheme';

export default function AdminLayout() {
  const { allowed, loading, signOut } = useAdminGate();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
      <SafeAreaView style={styles.fallbackSafe} edges={['top', 'right', 'left', 'bottom']}>
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Admin access required</Text>
          <Text style={styles.fallbackText}>
            You need an admin account to view this console.
          </Text>
          <TouchableOpacity style={[styles.fallbackButton, styles.secondary]} onPress={signOut}>
            <Text style={[styles.fallbackButtonText, styles.secondaryText]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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

function createStyles(theme: AppTheme) {
  const inverseText = theme.colors.textInverse;

  return StyleSheet.create({
    fallbackSafe: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    fallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      padding: Math.max(theme.spacing.lg, 24),
      gap: theme.spacing.sm,
    },
    fallbackTitle: {
      ...(theme.typography.titleM || theme.typography.title2 || { fontSize: 20, fontWeight: '700' }),
      color: theme.colors.text,
    },
    fallbackText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    fallbackButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary[500],
      marginBottom: theme.spacing.xs,
    },
    fallbackButtonText: {
      ...theme.typography.button,
      color: inverseText,
      fontWeight: '600',
    },
    secondary: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    secondaryText: {
      color: theme.colors.text,
    },
  });
}
