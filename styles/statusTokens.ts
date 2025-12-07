import { RestaurantTheme } from './restaurantTheme';

type StatusToken = { label: string; color: string; background: string };

export function getOrderStatusToken(status: string, theme: RestaurantTheme): StatusToken {
  const infoBg = '#E8F0FF';
  const infoColor = '#4B88FF';
  const warningBg = '#FFE5E5';
  const warningColor = theme.colors.status.warning;
  const accentBg = theme.colors.accentSoft;
  const accentColor = theme.colors.accent;

  const map: Record<string, StatusToken> = {
    pending: { label: 'NEW', color: accentColor, background: accentBg },
    confirmed: { label: 'IN PROGRESS', color: infoColor, background: infoBg },
    preparing: { label: 'IN PROGRESS', color: infoColor, background: infoBg },
    ready: { label: 'READY', color: accentColor, background: accentBg },
    picked_up: { label: 'OUT FOR DELIVERY', color: infoColor, background: infoBg },
    delivered: { label: 'DELIVERED', color: theme.colors.textMuted, background: theme.colors.surfaceAlt },
    cancelled: { label: 'CANCELLED', color: warningColor, background: warningBg },
  };

  return map[status] ?? { label: status.toUpperCase?.() || status, color: theme.colors.text, background: theme.colors.surfaceAlt };
}

export function getPaymentStatusToken(paymentStatus: string, theme: RestaurantTheme): StatusToken {
  const successBg = '#E9F7EE';
  const warningBg = '#FFE5E5';
  const warningColor = theme.colors.status.warning;

  const map: Record<string, StatusToken> = {
    paid: { label: 'PAID', color: theme.colors.status.success, background: successBg },
    paid_pending_review: { label: 'PAYMENT HOLD', color: warningColor, background: warningBg },
    payment_pending: { label: 'PAYMENT PENDING', color: warningColor, background: warningBg },
    hold: { label: 'PAYMENT HOLD', color: warningColor, background: warningBg },
    failed: { label: 'FAILED', color: theme.colors.status.error, background: warningBg },
  };

  return map[paymentStatus] ?? { label: paymentStatus.replace(/_/g, ' ').toUpperCase(), color: theme.colors.textMuted, background: theme.colors.surfaceAlt };
}
