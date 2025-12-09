import React from 'react';
import { View, Text } from 'react-native';
import type { PaymentReviewItem } from '@/utils/db/admin';
import { formatCurrency } from '@/utils/formatters';

export type BadgeState = 'pending' | 'review' | 'paid' | 'failed' | 'initiated';

export const expectedPaymentAmount = (o: PaymentReviewItem) =>
  Number((o.subtotal ?? 0) + (o.tax_amount ?? 0) + (o.tip_amount ?? 0) + (o.delivery_fee ?? 0) + (o.platform_fee ?? 0));

export const money = (val?: number | null) => formatCurrency(Number(val ?? 0));

export const safeUrl = (u?: string | null) => {
  if (!u) return null;
  try {
    const parsed = new URL(u);
    return parsed.toString();
  } catch {
    return null;
  }
};

export const paymentBadgeState = (status?: string | null): BadgeState => {
  if (!status) return 'pending';
  if (status === 'paid_pending_review') return 'review';
  if (status === 'paid' || status === 'captured') return 'paid';
  if (status === 'failed' || status === 'refunded' || status === 'voided') return 'failed';
  return 'pending';
};

export const payoutBadgeState = (status?: string | null): BadgeState => {
  if (!status) return 'pending';
  if (status === 'initiated') return 'initiated';
  if (status === 'paid') return 'paid';
  if (status === 'failed') return 'failed';
  return 'pending';
};

export const makeBadgeRenderer = (styles: any) => (label: string, state: BadgeState) => {
  const cls = badgeStyle(styles, state);
  return (
    <View style={[styles.badge, cls.container]}>
      <Text style={[styles.badgeText, cls.text]}>{label}</Text>
    </View>
  );
};

export const looksLikeImage = (u: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(u);

export const badgeStyle = (styles: any, state: BadgeState) => {
  switch (state) {
    case 'paid':
      return { container: styles.badgeSuccess, text: styles.badgeSuccessText };
    case 'review':
      return { container: styles.badgeWarning, text: styles.badgeWarningText };
    case 'failed':
      return { container: styles.badgeError, text: styles.badgeErrorText };
    case 'initiated':
      return { container: styles.badgeInfo, text: styles.badgeInfoText };
    default:
      return { container: styles.badgeNeutral, text: styles.badgeNeutralText };
  }
};
