import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';

import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { wp, hp } from '@/styles/responsive';

export default function KycStepScreen() {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { step } = useLocalSearchParams<{ step?: string }>();
  const currentStep = Number(step || 1);
  const [form, setForm] = useState({ fullName: '', dob: '', nationality: '', address: '' });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <Text style={styles.title}>KYC Verification</Text>
        <Text style={styles.stepLabel}>Step {currentStep} of 3</Text>
        <View style={styles.progress}>
          {[1, 2, 3].map((idx) => (
            <View key={idx} style={[styles.progressSegment, idx <= currentStep ? styles.progressActive : null]} />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Owner/Representative Details</Text>
        <Text style={styles.sectionSubtitle}>This information is required to verify the identity of the primary business owner or legal representative.</Text>

        <Text style={styles.fieldLabel}>Full Legal Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full legal name"
          value={form.fullName}
          onChangeText={(v) => setForm((p) => ({ ...p, fullName: v }))}
          placeholderTextColor={theme.colors.formPlaceholder}
        />

        <Text style={styles.fieldLabel}>Date of Birth</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={form.dob}
          onChangeText={(v) => setForm((p) => ({ ...p, dob: v }))}
          placeholderTextColor={theme.colors.formPlaceholder}
        />

        <Text style={styles.fieldLabel}>Nationality</Text>
        <TextInput
          style={styles.input}
          placeholder="Select your nationality"
          value={form.nationality}
          onChangeText={(v) => setForm((p) => ({ ...p, nationality: v }))}
          placeholderTextColor={theme.colors.formPlaceholder}
        />

        <Text style={styles.fieldLabel}>Residential Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your street address"
          value={form.address}
          onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
          placeholderTextColor={theme.colors.formPlaceholder}
        />

        <View style={styles.helperRow}>
          <Text style={styles.helperText}>Your information is encrypted and securely stored.</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cta} activeOpacity={0.9}>
        <Text style={styles.ctaText}>Continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const horizontal = Math.max(theme.spacing.md, wp('5%'));
  const vertical = Math.max(theme.spacing.md, hp('2.5%'));
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: horizontal,
      paddingTop: vertical,
      paddingBottom: theme.insets.bottom + vertical,
    },
    header: { gap: theme.spacing.xs, marginBottom: theme.spacing.md },
    title: { ...theme.typography.title2 },
    stepLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
    progress: { flexDirection: 'row', gap: theme.spacing.xs },
    progressSegment: { flex: 1, height: 6, borderRadius: 6, backgroundColor: theme.colors.borderMuted },
    progressActive: { backgroundColor: theme.colors.accent },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
      gap: theme.spacing.sm,
    },
    sectionTitle: { ...theme.typography.subhead },
    sectionSubtitle: { ...theme.typography.body, color: theme.colors.secondaryText, lineHeight: 22 },
    fieldLabel: { ...theme.typography.subhead, marginTop: theme.spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.formSurface,
      color: theme.colors.formText,
      marginTop: theme.spacing.xs,
    },
    helperRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
    helperText: { ...theme.typography.caption, color: theme.colors.secondaryText },
    cta: {
      marginTop: vertical,
      backgroundColor: theme.colors.accent,
      paddingVertical: Math.max(theme.spacing.md, hp('2%')),
      borderRadius: theme.radius.cta,
      alignItems: 'center',
      ...theme.shadows.card,
    },
    ctaText: { ...theme.typography.button, color: theme.colors.textInverse },
  });
}
