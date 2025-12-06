import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { styles } from '@/styles/adminMetrics';

export type NavItem = { key: string; label: string; href?: string; children?: NavItem[] };

type SectionNavProps = {
  activeSection: string | null;
  onPress: (keyOrHref: string) => void;
  items?: NavItem[];
  scrollable?: boolean;
  variant?: 'primary' | 'sub';
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

function SectionNav({ activeSection, onPress, items = defaultItems, scrollable = false, variant = 'primary' }: SectionNavProps) {
  const content = (
    <View style={[styles.sectionNav, scrollable && styles.sectionNavScrollable]}>
      {items.map(item => {
        const active = isActive(activeSection, item);
        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.navPill,
              variant === 'sub' && styles.navPillSub,
              active && styles.navPillActive,
            ]}
            onPress={() => onPress(item.href || item.key)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.navPillText,
                active && styles.navPillTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.sectionNav, styles.sectionNavScrollable]}
      >
        {content}
      </ScrollView>
    );
  }

  return (
    <View style={variant === 'sub' ? styles.subNav : undefined}>{content}</View>
  );
}

export { SectionNav };
export default SectionNav;
