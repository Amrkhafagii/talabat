import React, { useMemo } from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type StepperProps = {
  steps: string[];
  currentIndex: number;
  style?: ViewStyle;
};

export default function Stepper({ steps, currentIndex, style }: StepperProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, style]}>
      {steps.map((label, idx) => {
        const active = idx <= currentIndex;
        const isLast = idx === steps.length - 1;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.circle, active && styles.circleActive]}>
              <Text style={[styles.circleLabel, active && styles.circleLabelActive]}>{idx + 1}</Text>
            </View>
            {!isLast && <View style={[styles.bar, active && styles.barActive]} />}
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]} numberOfLines={1}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const circleSize = theme.spacing.lg + theme.spacing.md;
  return StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    step: { flex: 1, alignItems: 'center' },
    circle: {
      width: circleSize,
      height: circleSize,
      borderRadius: circleSize / 2,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleActive: { backgroundColor: theme.colors.primary[500], borderColor: theme.colors.primary[500] },
    circleLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
    circleLabelActive: { color: theme.colors.textInverse, fontFamily: 'Inter-SemiBold' },
    bar: {
      height: 2,
      backgroundColor: theme.colors.border,
      flex: 1,
      marginHorizontal: 4,
      borderRadius: theme.radius.sm,
    },
    barActive: { backgroundColor: theme.colors.primary[500] },
    stepLabel: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: theme.spacing.xs },
    stepLabelActive: { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
  });
}
