import React, { ComponentProps, memo, useMemo } from 'react';
import { ColorValue, StyleProp, TextStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme, type AppTheme } from '@/styles/appTheme';

type FeatherName = ComponentProps<typeof Feather>['name'];
type MaterialName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export type IconFamily = 'Feather' | 'MaterialCommunityIcons';

type IconConfig =
  | { family: 'Feather'; name: FeatherName }
  | { family: 'MaterialCommunityIcons'; name: MaterialName };

export const ICON_MAP = {
  AlertCircle: { family: 'Feather', name: 'alert-circle' },
  AlertTriangle: { family: 'Feather', name: 'alert-triangle' },
  ArrowDown: { family: 'Feather', name: 'arrow-down' },
  ArrowLeft: { family: 'Feather', name: 'arrow-left' },
  ArrowRightCircle: { family: 'Feather', name: 'arrow-right-circle' },
  ArrowUp: { family: 'Feather', name: 'arrow-up' },
  ArrowUpRight: { family: 'Feather', name: 'arrow-up-right' },
  BarChart3: { family: 'MaterialCommunityIcons', name: 'chart-bar' },
  Bell: { family: 'Feather', name: 'bell' },
  BookOpen: { family: 'Feather', name: 'book-open' },
  Briefcase: { family: 'Feather', name: 'briefcase' },
  Calendar: { family: 'Feather', name: 'calendar' },
  CalendarDays: { family: 'MaterialCommunityIcons', name: 'calendar-month-outline' },
  Camera: { family: 'Feather', name: 'camera' },
  Car: { family: 'MaterialCommunityIcons', name: 'car-outline' },
  ChartBar: { family: 'MaterialCommunityIcons', name: 'chart-bar' },
  Check: { family: 'Feather', name: 'check' },
  CheckCircle: { family: 'Feather', name: 'check-circle' },
  CheckCircle2: { family: 'Feather', name: 'check-circle' },
  CheckSquare: { family: 'Feather', name: 'check-square' },
  ChevronDown: { family: 'Feather', name: 'chevron-down' },
  ChevronRight: { family: 'Feather', name: 'chevron-right' },
  ChevronUp: { family: 'Feather', name: 'chevron-up' },
  Chrome: { family: 'Feather', name: 'home' },
  Home: { family: 'Feather', name: 'home' },
  Circle: { family: 'Feather', name: 'circle' },
  CircleCheck: { family: 'Feather', name: 'check-circle' },
  CircleHelp: { family: 'Feather', name: 'help-circle' },
  HelpCircle: { family: 'Feather', name: 'help-circle' },
  ClipboardList: { family: 'MaterialCommunityIcons', name: 'clipboard-list-outline' },
  Clock: { family: 'Feather', name: 'clock' },
  Clock3: { family: 'MaterialCommunityIcons', name: 'clock-outline' },
  Clock4: { family: 'MaterialCommunityIcons', name: 'clock-outline' },
  Copy: { family: 'Feather', name: 'copy' },
  CreditCard: { family: 'Feather', name: 'credit-card' },
  DollarSign: { family: 'Feather', name: 'dollar-sign' },
  Eye: { family: 'Feather', name: 'eye' },
  EyeOff: { family: 'Feather', name: 'eye-off' },
  FileText: { family: 'Feather', name: 'file-text' },
  Filter: { family: 'Feather', name: 'filter' },
  GripVertical: { family: 'MaterialCommunityIcons', name: 'drag-vertical' },
  Heart: { family: 'Feather', name: 'heart' },
  History: { family: 'MaterialCommunityIcons', name: 'history' },
  Info: { family: 'Feather', name: 'info' },
  KeyRound: { family: 'MaterialCommunityIcons', name: 'key-variant' },
  LayoutDashboard: { family: 'MaterialCommunityIcons', name: 'view-dashboard-outline' },
  Lock: { family: 'Feather', name: 'lock' },
  LogOut: { family: 'Feather', name: 'log-out' },
  Mail: { family: 'Feather', name: 'mail' },
  MapPin: { family: 'Feather', name: 'map-pin' },
  Minus: { family: 'Feather', name: 'minus' },
  Navigation: { family: 'Feather', name: 'navigation' },
  Package: { family: 'Feather', name: 'package' },
  Pencil: { family: 'Feather', name: 'edit-3' },
  Edit: { family: 'Feather', name: 'edit-3' },
  Phone: { family: 'Feather', name: 'phone' },
  Plus: { family: 'Feather', name: 'plus' },
  Receipt: { family: 'MaterialCommunityIcons', name: 'receipt-outline' },
  RefreshCw: { family: 'Feather', name: 'refresh-ccw' },
  Search: { family: 'Feather', name: 'search' },
  Settings: { family: 'Feather', name: 'settings' },
  Shield: { family: 'Feather', name: 'shield' },
  ShieldCheck: { family: 'MaterialCommunityIcons', name: 'shield-check' },
  ShoppingCart: { family: 'Feather', name: 'shopping-cart' },
  Square: { family: 'Feather', name: 'square' },
  Star: { family: 'Feather', name: 'star' },
  Store: { family: 'MaterialCommunityIcons', name: 'storefront-outline' },
  Trash2: { family: 'Feather', name: 'trash-2' },
  Truck: { family: 'Feather', name: 'truck' },
  User: { family: 'Feather', name: 'user' },
  Users: { family: 'Feather', name: 'users' },
  UtensilsCrossed: { family: 'MaterialCommunityIcons', name: 'silverware-fork-knife' },
  Wallet: { family: 'MaterialCommunityIcons', name: 'wallet-outline' },
  WalletIcon: { family: 'MaterialCommunityIcons', name: 'wallet-outline' },
  Wifi: { family: 'Feather', name: 'wifi' },
  WifiOff: { family: 'Feather', name: 'wifi-off' },
  X: { family: 'Feather', name: 'x' },
  XCircle: { family: 'Feather', name: 'x-circle' },
} as const satisfies Record<string, IconConfig>;

const FALLBACK_ICON: IconConfig = { family: 'Feather', name: 'help-circle' };

export type IconName = keyof typeof ICON_MAP;

type IconSizeKey = keyof AppTheme['iconSizes'];
type StatusName = keyof AppTheme['colors']['status'];

type CommonIconProps = {
  name: IconName | string;
  size?: IconSizeKey | number;
  color?: ColorValue;
  status?: StatusName;
  family?: IconFamily;
  accessibilityLabel?: string;
  allowFontScaling?: boolean;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

export type IconProps = CommonIconProps & {
  // Keep the surface area small so we can swap families without leaking props.
  // Extra props can be added as needed during migrations.
  onLayout?: ComponentProps<typeof Feather>['onLayout'];
};

export function resolveIcon(name: IconName | string): { config: IconConfig; isFallback: boolean } {
  const config = ICON_MAP[name as IconName];
  if (config) return { config, isFallback: false };
  console.warn(`[Icon] Missing icon mapping for "${name}", falling back to help-circle.`);
  return { config: FALLBACK_ICON, isFallback: true };
}

export const Icon = memo(function Icon({
  name,
  size = 'md',
  color,
  status,
  family,
  style,
  accessibilityLabel,
  allowFontScaling,
  testID,
  onLayout,
}: IconProps) {
  const theme = useAppTheme();

  const resolvedSize = typeof size === 'number' ? size : theme.iconSizes[size] ?? theme.iconSizes.md;
  const resolvedColor =
    color ??
    (status && theme.colors.status[status])
    ?? theme.colors.text;

  const { config } = useMemo(() => {
    if (family) return { config: { family, name: name as FeatherName } as IconConfig, isFallback: false };
    return resolveIcon(name);
  }, [family, name]);

  const IconComponent = config.family === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Feather;

  return (
    <IconComponent
      allowFontScaling={allowFontScaling}
      accessibilityLabel={accessibilityLabel ?? `${name} icon`}
      accessibilityRole="image"
      color={resolvedColor as string}
      name={config.name as any}
      onLayout={onLayout}
      size={resolvedSize}
      style={style}
      testID={testID}
    />
  );
});

Icon.displayName = 'Icon';
