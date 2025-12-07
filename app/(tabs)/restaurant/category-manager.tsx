import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function CategoryManagerScreen() {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <Text style={styles.title}>Category Manager</Text>
      <Text style={styles.subtitle}>Reordering, renaming, and creation flows will move here.</Text>
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
      ...theme.typography.body,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing.xs,
      lineHeight: 22,
    },
    placeholder: { flex: 1 },
  });
}
