import React, { useMemo } from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type StepStatus = 'done' | 'current' | 'pending';

export interface ProgressStep {
  key: string;
  label: string;
  status: StepStatus;
}

interface ProgressStepsProps {
  steps: ProgressStep[];
  style?: ViewStyle;
}

export default function ProgressSteps({ steps, style }: ProgressStepsProps) {
  const { colors, spacing, radius, typography } = useRestaurantTheme();

  const styles = useMemo(
    () => ({
      container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      } as ViewStyle,
      node: {
        width: 20,
        height: 20,
        borderRadius: radius.pill,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
      } as ViewStyle,
      nodeCurrent: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.accent,
      } as ViewStyle,
      nodeDone: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
      } as ViewStyle,
      label: {
        ...typography.caption,
        marginTop: spacing.xs,
        color: colors.textSubtle,
        textAlign: 'center',
      } as TextStyle,
      labelCurrent: {
        color: colors.accent,
      } as TextStyle,
      labelDone: {
        color: colors.accent,
      } as TextStyle,
      line: {
        flex: 1,
        height: 2,
        backgroundColor: colors.border,
        marginHorizontal: spacing.sm,
      } as ViewStyle,
      lineActive: {
        backgroundColor: colors.accent,
      } as ViewStyle,
    }),
    [colors.accent, colors.accentSoft, colors.border, colors.surface, colors.textSubtle, radius.pill, spacing.sm, spacing.xs, typography.caption]
  );

  return (
    <View style={[styles.container, style]}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const nodeStyle =
          step.status === 'done'
            ? styles.nodeDone
            : step.status === 'current'
              ? styles.nodeCurrent
              : undefined;
        const labelStyle =
          step.status === 'done'
            ? styles.labelDone
            : step.status === 'current'
              ? styles.labelCurrent
              : undefined;
        const lineActive = step.status === 'done';

        return (
          <React.Fragment key={step.key}>
            <View style={{ alignItems: 'center', flexShrink: 0 }}>
              <View style={[styles.node, nodeStyle]} />
              <Text style={[styles.label, labelStyle]}>{step.label}</Text>
            </View>
            {!isLast && <View style={[styles.line, lineActive && styles.lineActive]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}
