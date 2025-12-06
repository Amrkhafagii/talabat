import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ViewStyle, TextStyle, useWindowDimensions } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';

export type NavItem = { key: string; label: string; href?: string; children?: NavItem[] };

type SectionNavProps = {
  activeSection: string | null;
  onPress: (keyOrHref: string) => void;
  items?: NavItem[];
  scrollable?: boolean;
  variant?: 'ios' | 'ios-sub';
};

const defaultItems: NavItem[] = [
  { key: 'payments', label: 'Payments' },
  { key: 'licenses', label: 'Licenses' },
  { key: 'photos', label: 'Menu photos' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'alerts', label: 'Alerts' }
];

function normalize(val: string) {
  return val.split('?')[0].split('#')[0];
}

function isActive(activeSection: string | null, item: NavItem) {
  if (!activeSection) return false;
  const cleanedActive = normalize(activeSection);
  const cleanedHref = item.href ? normalize(item.href) : null;
  return (
    cleanedActive === item.key ||
    cleanedActive === cleanedHref ||
    (!!cleanedHref && cleanedActive.startsWith(cleanedHref)) ||
    cleanedActive.startsWith(item.key)
  );
}

function SectionNav({ activeSection, onPress, items = defaultItems, scrollable = false, variant = 'ios' }: SectionNavProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 450;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        iosNav.sectionNav,
        iosNav.sectionNavScrollable,
        variant === 'ios-sub' ? iosNav.subNav : null,
      ]}
    >
      {items.map(item => {
        const active = isActive(activeSection, item);
        return (
          <TouchableOpacity
            key={item.key}
            style={[
              iosNav.navPill,
              isPhone && iosNav.navPillPhone,
              variant === 'ios-sub' && iosNav.navPillSub,
              active && iosNav.navPillActive,
            ]}
            onPress={() => onPress(item.href || item.key)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                iosNav.navPillText,
                active && iosNav.navPillTextActive,
                isPhone && iosNav.navPillTextPhone,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.label || item.key}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export { SectionNav };
export default SectionNav;

type IosNavStyles = {
  sectionNav: ViewStyle;
  sectionNavScrollable: ViewStyle;
  subNav: ViewStyle;
  navPill: ViewStyle;
  navPillPhone: ViewStyle;
  navPillSub: ViewStyle;
  navPillActive: ViewStyle;
  navPillText: TextStyle;
  navPillTextPhone: TextStyle;
  navPillTextActive: TextStyle;
};

const iosNav = StyleSheet.create<IosNavStyles>({
  sectionNav: { flexDirection: 'row', flexWrap: 'nowrap', gap: iosSpacing.xs, marginHorizontal: iosSpacing.sm, marginTop: iosSpacing.sm, marginBottom: iosSpacing.sm },
  sectionNavScrollable: { paddingRight: iosSpacing.sm },
  subNav: { marginTop: iosSpacing.xs },
  navPill: {
    paddingHorizontal: iosSpacing.md,
    paddingVertical: iosSpacing.sm,
    borderRadius: iosRadius.pill,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    minHeight: 34,
  },
  navPillPhone: {
    paddingHorizontal: iosSpacing.sm,
    paddingVertical: iosSpacing.xs,
    minHeight: 30,
  },
  navPillSub: {
    paddingVertical: iosSpacing.xs,
  },
  navPillActive: {
    backgroundColor: iosColors.surface,
    borderWidth: 1,
    borderColor: iosColors.primary,
  },
  navPillText: { ...iosTypography.subhead, color: iosColors.text, lineHeight: 18 },
  navPillTextPhone: { fontSize: 13, lineHeight: 16 },
  navPillTextActive: { color: iosColors.primary, fontWeight: '600' },
});
