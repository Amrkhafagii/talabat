import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '@/styles/adminMetrics';

export type ActionBannerProps = {
  text: string;
  tone?: 'success' | 'warning' | 'error';
  undo?: () => void;
};

export default function ActionBanner({ text, tone = 'warning', undo }: ActionBannerProps) {
  const container =
    tone === 'success'
      ? styles.bannerSuccess
      : tone === 'error'
        ? styles.bannerError
        : styles.bannerWarning;
  const textStyle =
    tone === 'success'
      ? styles.bannerSuccessText
      : tone === 'error'
        ? styles.bannerErrorText
        : styles.bannerWarningText;

  return (
    <View style={[styles.banner, container]}>
      <Text style={[styles.bannerText, textStyle]}>{text}</Text>
      {undo && (
        <TouchableOpacity onPress={undo}>
          <Text style={styles.bannerLink}>Undo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
