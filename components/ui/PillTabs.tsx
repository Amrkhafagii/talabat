import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, View, Text, ViewStyle, StyleSheet } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export type PillTab = { key: string; label: string; badge?: string | number };

type PillTabsProps = {
  tabs: PillTab[];
  activeKey: string;
  onChange: (key: string) => void;
  style?: ViewStyle;
  scrollable?: boolean;
};

export default function PillTabs({ tabs, activeKey, onChange, style, scrollable = true }: PillTabsProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const content = (
    <View style={[styles.container, style]}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, active && styles.tabActive]}
            hitSlop={theme.tap.hitSlop}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            {tab.badge !== undefined && (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{tab.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {content}
      </ScrollView>
    );
  }

  return content;
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    scrollContainer: { paddingHorizontal: theme.spacing.lg },
    container: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.pill,
      padding: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    tab: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: 'transparent',
      borderWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    tabActive: {
      backgroundColor: theme.colors.accent,
    },
    tabLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
    tabLabelActive: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
    badge: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    badgeActive: { backgroundColor: '#FFFFFF22', borderColor: '#FFFFFF44' },
    badgeText: { ...theme.typography.caption, color: theme.colors.secondaryText },
    badgeTextActive: { color: '#FFFFFF' },
  });
}
