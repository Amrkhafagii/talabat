import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { iosColors, iosRadius, iosShadow, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { wp } from '@/styles/responsive';

type HeaderAction = { label: string; onPress: () => void };

type IOSHeaderBarProps = {
  title: string;
  leadingAction?: HeaderAction;
  trailingAction?: HeaderAction;
  doneAction?: HeaderAction;
  style?: StyleProp<ViewStyle>;
  showShadow?: boolean;
};

export function IOSHeaderBar({ title, leadingAction, trailingAction, doneAction, style, showShadow = true }: IOSHeaderBarProps) {
  const paddingHorizontal = Math.max(iosSpacing.md, wp('5%'));
  const buttonPadX = iosSpacing.sm;
  const buttonPadY = iosSpacing.xs;
  const sideWidth = Math.max(88, wp('24%'));
  const textStyle = iosTypography.button;

  return (
    <View style={[styles.container, { paddingHorizontal }, showShadow && iosShadow.header, style]}>
      <View style={[styles.side, { minWidth: sideWidth }]}>
        {leadingAction ? (
          <TouchableOpacity onPress={leadingAction.onPress} hitSlop={8}>
            <Text style={[styles.link, textStyle]} numberOfLines={1}>{leadingAction.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={[styles.side, { minWidth: sideWidth }]}>
        {trailingAction ? (
          <TouchableOpacity onPress={trailingAction.onPress} hitSlop={8}>
            <Text style={[styles.link, textStyle]} numberOfLines={1}>{trailingAction.label}</Text>
          </TouchableOpacity>
        ) : doneAction ? (
          <TouchableOpacity onPress={doneAction.onPress} style={[styles.doneButton, { paddingHorizontal: buttonPadX, paddingVertical: buttonPadY }]} hitSlop={8}>
            <Text style={[styles.doneText, textStyle]} numberOfLines={1}>{doneAction.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

type Styles = {
  container: ViewStyle;
  title: TextStyle;
  link: TextStyle;
  doneButton: ViewStyle;
  doneText: TextStyle;
  side: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  container: {
    height: 56,
    backgroundColor: iosColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...iosTypography.title2, textAlign: 'center', flex: 1 },
  link: { ...iosTypography.button, color: iosColors.primary },
  doneButton: {
    backgroundColor: iosColors.primary,
    paddingHorizontal: iosSpacing.sm,
    paddingVertical: iosSpacing.xs,
    borderRadius: iosRadius.pill,
    ...iosShadow.button,
  },
  doneText: { ...iosTypography.button, color: '#FFFFFF' },
  side: { width: 80, flexDirection: 'row', justifyContent: 'flex-start' },
});

export default IOSHeaderBar;
