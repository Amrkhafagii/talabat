import { RestaurantTheme } from './restaurantTheme';

type StatusToken = { label: string; color: string; background: string };

export function getOrderStatusToken(status: string, theme: RestaurantTheme): StatusToken {
  const primaryBg = theme.colors.primary[100];
  const primaryColor = theme.colors.primary[500];
  const infoBg = theme.colors.statusSoft.info;
  const infoColor = theme.colors.status.info;
  const successBg = theme.colors.statusSoft.success;
  const successColor = theme.colors.status.success;
  const errorBg = theme.colors.statusSoft.error;
  const errorColor = theme.colors.status.error;

  const map: Record<string, StatusToken> = {
    pending: { label: 'NEW', color: primaryColor, background: primaryBg },
    confirmed: { label: 'IN PROGRESS', color: infoColor, background: infoBg },
    preparing: { label: 'IN PROGRESS', color: infoColor, background: infoBg },
    ready: { label: 'READY', color: primaryColor, background: primaryBg },
    picked_up: { label: 'OUT FOR DELIVERY', color: infoColor, background: infoBg },
    delivered: { label: 'DELIVERED', color: successColor, background: successBg },
    cancelled: { label: 'CANCELLED', color: errorColor, background: errorBg },
  };

  return map[status] ?? { label: status.toUpperCase?.() || status, color: theme.colors.text, background: theme.colors.surfaceAlt };
}

export function getPaymentStatusToken(paymentStatus: string, theme: RestaurantTheme): StatusToken {
  const successBg = theme.colors.statusSoft.success;
  const warningBg = theme.colors.statusSoft.warning;
  const warningColor = theme.colors.status.warning;

  const map: Record<string, StatusToken> = {
    paid: { label: 'PAID', color: theme.colors.status.success, background: successBg },
    paid_pending_review: { label: 'PAYMENT HOLD', color: warningColor, background: warningBg },
    payment_pending: { label: 'PAYMENT PENDING', color: warningColor, background: warningBg },
    hold: { label: 'PAYMENT HOLD', color: warningColor, background: warningBg },
    failed: { label: 'FAILED', color: theme.colors.status.error, background: theme.colors.statusSoft.error },
  };

  return map[paymentStatus] ?? { label: paymentStatus.replace(/_/g, ' ').toUpperCase(), color: theme.colors.textMuted, background: theme.colors.surfaceAlt };
}
