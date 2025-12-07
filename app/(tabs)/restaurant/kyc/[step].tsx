import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';

import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function KycStepScreen() {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { step } = useLocalSearchParams<{ step?: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <Text style={styles.title}>KYC Step</Text>
      <Text style={styles.subtitle}>Current step: {step || 'start'}</Text>
      <Text style={styles.helper}>Detailed forms, uploads, and progress indicators will be wired here.</Text>
      <View style={styles.placeholder} />
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const isCompact = theme.device.isSmallScreen;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    title: {
      ...theme.typography.title2,
    },
    subtitle: {
      ...theme.typography.subhead,
      marginTop: theme.spacing.xs,
    },
    helper: {
      ...theme.typography.body,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing.sm,
      lineHeight: 22,
    },
    placeholder: { flex: 1 },
  });
}
