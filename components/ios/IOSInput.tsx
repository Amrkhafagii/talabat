import React from 'react';
import { TextInput, StyleSheet, StyleProp, TextStyle, TextInputProps } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';

type IOSInputProps = TextInputProps & { style?: StyleProp<TextStyle> };

export function IOSInput(props: IOSInputProps) {
  return (
    <TextInput
      placeholderTextColor={iosColors.placeholder}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create<{ input: TextStyle }>({
  input: {
    ...iosTypography.body,
    backgroundColor: iosColors.surfaceMuted,
    borderRadius: iosRadius.md,
    borderWidth: 1,
    borderColor: iosColors.separator,
    paddingHorizontal: iosSpacing.md,
    paddingVertical: iosSpacing.sm,
    minHeight: 46,
  },
});

export default IOSInput;
