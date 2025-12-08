import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function KycLandingScreen() {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [currentStep] = useState(1);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <Text style={styles.title}>KYC Verification</Text>
      <Text style={styles.subtitle}>Verify your identity to enable seamless payouts.</Text>

      <View style={styles.card}>
        <Text style={styles.stepLabel}>Step {currentStep} of 3</Text>
        <View style={styles.progress}>
          {[1, 2, 3].map((idx) => (
            <View key={idx} style={[styles.progressSegment, idx <= currentStep ? styles.progressActive : null]} />
          ))}
        </View>
        <Text style={styles.sectionTitle}>Owner/Representative Details</Text>
        <Text style={styles.sectionSubtitle}>
          Provide your legal name, date of birth, nationality, and address so we can verify your account.
        </Text>
      </View>

      <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={() => router.push('/(tabs)/restaurant/kyc/1' as any)}>
        <Text style={styles.ctaText}>Continue</Text>
      </TouchableOpacity>
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
      paddingBottom: theme.insets.bottom + theme.spacing.lg,
    },
    title: { ...theme.typography.title2, marginBottom: theme.spacing.xs },
    subtitle: { ...theme.typography.body, color: theme.colors.secondaryText, marginBottom: theme.spacing.lg },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
      gap: theme.spacing.sm,
    },
    stepLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
    progress: { flexDirection: 'row', gap: theme.spacing.xs },
    progressSegment: { flex: 1, height: 6, borderRadius: 6, backgroundColor: theme.colors.borderMuted },
    progressActive: { backgroundColor: theme.colors.accent },
    sectionTitle: { ...theme.typography.subhead },
    sectionSubtitle: { ...theme.typography.body, color: theme.colors.secondaryText, lineHeight: 22 },
    cta: {
      marginTop: theme.spacing.lg,
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.cta,
      alignItems: 'center',
      ...theme.shadows.card,
    },
    ctaText: { ...theme.typography.button, color: theme.colors.textInverse },
  });
}
