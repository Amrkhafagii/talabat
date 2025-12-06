import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography, iosShadow } from '@/styles/iosTheme';

type Segment<T extends string> = { key: T; label: string; badge?: string | number; disabled?: boolean };

type IOSSegmentedControlProps<T extends string> = {
  segments: Array<Segment<T>>;
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

export function IOSSegmentedControl<T extends string>({ segments, value, onChange, style }: IOSSegmentedControlProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {segments.map((seg) => {
        const selected = seg.key === value;
        return (
          <TouchableOpacity
            key={seg.key}
            style={[styles.segment, selected && styles.segmentActive, seg.disabled && styles.segmentDisabled]}
            onPress={() => onChange(seg.key)}
            disabled={seg.disabled}
            accessibilityState={{ selected, disabled: seg.disabled }}
            accessibilityRole="button"
          >
            <Text style={[styles.label, selected && styles.labelActive]}>{seg.label}</Text>
            {seg.badge !== undefined && (
              <View style={[styles.badge, selected && styles.badgeActive]}>
                <Text style={[styles.badgeText, selected && styles.badgeTextActive]}>{seg.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type Styles = {
  container: ViewStyle;
  segment: ViewStyle;
  segmentActive: ViewStyle;
  segmentDisabled: ViewStyle;
  label: TextStyle;
  labelActive: TextStyle;
  badge: ViewStyle;
  badgeActive: ViewStyle;
  badgeText: TextStyle;
  badgeTextActive: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  container: {
    flexDirection: 'row',
    backgroundColor: iosColors.chipBg,
    borderRadius: iosRadius.pill,
    padding: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: iosSpacing.xxs,
    paddingVertical: iosSpacing.xs,
    minHeight: 40,
    borderRadius: iosRadius.pill,
  },
  segmentActive: {
    backgroundColor: iosColors.surface,
    borderWidth: 1,
    borderColor: iosColors.primary,
    ...iosShadow.card,
  },
  segmentDisabled: {
    opacity: 0.5,
  },
  label: { ...iosTypography.subhead, color: iosColors.secondaryText },
  labelActive: { color: iosColors.primary },
  badge: {
    minWidth: 22,
    paddingHorizontal: iosSpacing.xxs,
    paddingVertical: 2,
    borderRadius: iosRadius.pill,
    backgroundColor: iosColors.separator,
  },
  badgeActive: { backgroundColor: iosColors.primary },
  badgeText: { ...iosTypography.caption, color: iosColors.secondaryText, fontWeight: '600' },
  badgeTextActive: { color: '#FFFFFF' },
});

export default IOSSegmentedControl;
