import React, { useMemo } from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type TimelineItemProps = {
  title: string;
  subtitle?: string;
  time?: string;
  active?: boolean;
  completed?: boolean;
  style?: ViewStyle;
};

export default function TimelineItem({ title, subtitle, time, active, completed, style }: TimelineItemProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const indicatorColor = completed ? theme.colors.status.success : active ? theme.colors.accent : theme.colors.border;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.indicatorCol}>
        <View style={[styles.dot, { borderColor: indicatorColor, backgroundColor: completed ? indicatorColor : theme.colors.surface }]} />
        <View style={[styles.line, { backgroundColor: theme.colors.borderMuted }]} />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: theme.spacing.sm },
    indicatorCol: { alignItems: 'center' },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
    },
    line: {
      flex: 1,
      width: 2,
      marginTop: theme.spacing.xs,
      borderRadius: 1,
    },
    content: {
      flex: 1,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderMuted,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { ...theme.typography.subhead, color: theme.colors.text },
    time: { ...theme.typography.caption, color: theme.colors.secondaryText },
    subtitle: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: theme.spacing.xs },
  });
}
