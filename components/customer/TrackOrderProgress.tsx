import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { orderSteps } from '@/hooks/useTrackOrder';

type Props = {
  currentStepIndex: number;
};

export function TrackOrderProgress({ currentStepIndex }: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={styles.progressCard}>
      <Text style={styles.sectionTitle}>Order Status</Text>
      <View style={styles.progressContainer}>
        {orderSteps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <View key={step.key} style={styles.progressStep}>
              <View style={styles.stepIconContainer}>
                <View
                  style={[
                    styles.stepIcon,
                    isCompleted && styles.stepIconCompleted,
                    isCurrent && styles.stepIconCurrent,
                  ]}
                >
                  <Icon name={StepIcon} size={16} color={isCompleted ? theme.colors.textInverse : theme.colors.textSubtle} />
                </View>
                {index < orderSteps.length - 1 && <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />}
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepLabel, isCompleted && styles.stepLabelCompleted]}>{step.label}</Text>
                {isCurrent && <Text style={styles.stepStatus}>In Progress</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    progressCard: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    progressContainer: {
      paddingLeft: 8,
    },
    progressStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    stepIconContainer: {
      alignItems: 'center',
      marginRight: 16,
    },
    stepIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepIconCompleted: {
      backgroundColor: theme.colors.status.success,
    },
    stepIconCurrent: {
      backgroundColor: theme.colors.primary[500],
    },
    stepLine: {
      width: 2,
      height: 24,
      backgroundColor: theme.colors.border,
      marginTop: 4,
    },
    stepLineCompleted: {
      backgroundColor: theme.colors.status.success,
    },
    stepContent: {
      flex: 1,
      paddingTop: 4,
    },
    stepLabel: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.textMuted,
    },
    stepLabelCompleted: {
      color: theme.colors.text,
    },
    stepStatus: {
      fontSize: 12,
      color: theme.colors.primary[500],
      fontFamily: 'Inter-Regular',
      marginTop: 2,
    },
  });
