import React, { ComponentProps, memo, useMemo } from 'react';
import { ColorValue, Platform, StyleProp, TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAppTheme, type AppTheme } from '@/styles/appTheme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
export type IconFamily = 'Ionicons' | 'MaterialIcons';

type IconConfig = { ios: IoniconName; android: MaterialIconName };

export const ICON_MAP = {
  AddressHome: { ios: 'home', android: 'home' },
  AddressOther: { ios: 'pricetag', android: 'sell' },
  AddressWork: { ios: 'briefcase', android: 'work' },
  AlertCircle: { ios: 'alert-circle-outline', android: 'error-outline' },
  AlertTriangle: { ios: 'warning-outline', android: 'warning-amber' },
  ArrowBack: { ios: 'arrow-back', android: 'arrow-back' },
  ArrowDown: { ios: 'arrow-down', android: 'arrow-downward' },
  ArrowLeft: { ios: 'arrow-back', android: 'arrow-back' },
  ArrowRightCircle: { ios: 'arrow-forward-circle-outline', android: 'arrow-circle-right' },
  ArrowUp: { ios: 'arrow-up', android: 'arrow-upward' },
  ArrowUpRight: { ios: 'arrow-up-right-box-outline', android: 'arrow-outward' },
  BarChart3: { ios: 'bar-chart-outline', android: 'bar-chart' },
  Bell: { ios: 'notifications-outline', android: 'notifications-none' },
  BookOpen: { ios: 'book-outline', android: 'menu-book' },
  Briefcase: { ios: 'briefcase-outline', android: 'work-outline' },
  BriefcaseSolid: { ios: 'briefcase', android: 'work' },
  Calendar: { ios: 'calendar-outline', android: 'calendar-today' },
  CalendarDays: { ios: 'calendar-number-outline', android: 'calendar-month' },
  Camera: { ios: 'camera-outline', android: 'photo-camera' },
  CameraFill: { ios: 'camera', android: 'photo-camera' },
  CameraPlus: { ios: 'camera-outline', android: 'add-a-photo' },
  Car: { ios: 'car-outline', android: 'directions-car' },
  ChartBar: { ios: 'stats-chart-outline', android: 'insert-chart-outlined' },
  Check: { ios: 'checkmark', android: 'check' },
  CheckCircle: { ios: 'checkmark-circle-outline', android: 'check-circle-outline' },
  CheckCircle2: { ios: 'checkmark-circle-outline', android: 'check-circle-outline' },
  CheckSquare: { ios: 'checkbox-outline', android: 'check-box' },
  ChevronBack: { ios: 'chevron-back-outline', android: 'chevron-left' },
  ChevronDown: { ios: 'chevron-down', android: 'keyboard-arrow-down' },
  ChevronRight: { ios: 'chevron-forward', android: 'chevron-right' },
  ChevronUp: { ios: 'chevron-up', android: 'keyboard-arrow-up' },
  Chrome: { ios: 'logo-chrome', android: 'home' },
  Home: { ios: 'home-outline', android: 'home' },
  Circle: { ios: 'ellipse-outline', android: 'circle' },
  CircleCheck: { ios: 'checkmark-circle-outline', android: 'check-circle-outline' },
  CircleHelp: { ios: 'help-circle-outline', android: 'help-outline' },
  HelpCircle: { ios: 'help-circle-outline', android: 'help-outline' },
  ClipboardList: { ios: 'clipboard-outline', android: 'assignment' },
  Clock: { ios: 'time-outline', android: 'schedule' },
  Clock3: { ios: 'time-outline', android: 'schedule' },
  Clock4: { ios: 'time-outline', android: 'schedule' },
  CloudArrowUp: { ios: 'cloud-upload-outline', android: 'cloud-upload' },
  Copy: { ios: 'copy-outline', android: 'content-copy' },
  CreditCard: { ios: 'card-outline', android: 'credit-card' },
  Crown: { ios: 'ribbon-outline', android: 'military-tech' },
  DollarSign: { ios: 'cash-outline', android: 'attach-money' },
  Eye: { ios: 'eye-outline', android: 'visibility' },
  EyeOff: { ios: 'eye-off-outline', android: 'visibility-off' },
  File: { ios: 'document-outline', android: 'insert-drive-file' },
  FileText: { ios: 'document-text-outline', android: 'description' },
  Filter: { ios: 'filter-outline', android: 'filter-list' },
  FilterFill: { ios: 'filter', android: 'filter-alt' },
  FolderHeart: { ios: 'heart-circle-outline', android: 'favorite' },
  GripVertical: { ios: 'reorder-three-outline', android: 'drag-handle' },
  Heart: { ios: 'heart-outline', android: 'favorite-border' },
  HeartSolid: { ios: 'heart', android: 'favorite' },
  History: { ios: 'time-outline', android: 'history' },
  HomeFill: { ios: 'home', android: 'home' },
  Image: { ios: 'image', android: 'image' },
  Info: { ios: 'information-circle-outline', android: 'info-outline' },
  KeyRound: { ios: 'key-outline', android: 'vpn-key' },
  LayoutDashboard: { ios: 'grid-outline', android: 'dashboard' },
  Lock: { ios: 'lock-closed-outline', android: 'lock' },
  LogOut: { ios: 'log-out-outline', android: 'logout' },
  Mail: { ios: 'mail-outline', android: 'mail-outline' },
  MapPin: { ios: 'location-outline', android: 'location-pin' },
  MapPinFill: { ios: 'location', android: 'location-on' },
  MapPinCircle: { ios: 'location', android: 'location-on' },
  MapTarget: { ios: 'locate-outline', android: 'my-location' },
  Minus: { ios: 'remove-outline', android: 'remove' },
  Navigation: { ios: 'navigate-outline', android: 'navigation' },
  Package: { ios: 'cube-outline', android: 'inventory-2' },
  Pencil: { ios: 'pencil-outline', android: 'edit' },
  Edit: { ios: 'create-outline', android: 'edit' },
  Phone: { ios: 'call-outline', android: 'phone' },
  Plus: { ios: 'add', android: 'add' },
  PlusCircle: { ios: 'add-circle-outline', android: 'add-circle-outline' },
  Photo: { ios: 'image-outline', android: 'insert-photo' },
  Gallery: { ios: 'images-outline', android: 'collections' },
  CloudUpload: { ios: 'cloud-upload-outline', android: 'cloud-upload' },
  Receipt: { ios: 'receipt-outline', android: 'receipt-long' },
  RefreshCw: { ios: 'refresh-outline', android: 'refresh' },
  Search: { ios: 'search-outline', android: 'search' },
  Settings: { ios: 'settings-outline', android: 'settings' },
  Shield: { ios: 'shield-outline', android: 'shield' },
  ShieldCheck: { ios: 'shield-checkmark-outline', android: 'verified-user' },
  ShieldInfo: { ios: 'information-circle-outline', android: 'info-outline' },
  ShoppingCart: { ios: 'cart-outline', android: 'shopping-cart' },
  Square: { ios: 'square-outline', android: 'square' },
  Star: { ios: 'star', android: 'star' },
  StarOutline: { ios: 'star-outline', android: 'star-outline' },
  StarHalf: { ios: 'star-half-outline', android: 'star-half' },
  Store: { ios: 'storefront-outline', android: 'storefront' },
  Tag: { ios: 'pricetag-outline', android: 'sell' },
  TagFill: { ios: 'pricetag', android: 'sell' },
  Trash2: { ios: 'trash-outline', android: 'delete-outline' },
  Truck: { ios: 'bus-outline', android: 'local-shipping' },
  User: { ios: 'person-outline', android: 'person-outline' },
  UserCircle: { ios: 'person-circle-outline', android: 'account-circle' },
  Users: { ios: 'people-outline', android: 'groups' },
  UtensilsCrossed: { ios: 'restaurant-outline', android: 'restaurant' },
  Upload: { ios: 'arrow-up-circle-outline', android: 'file-upload' },
  UploadFill: { ios: 'arrow-up-circle', android: 'file-upload' },
  Wallet: { ios: 'wallet-outline', android: 'account-balance-wallet' },
  WalletFill: { ios: 'wallet', android: 'account-balance-wallet' },
  WalletIcon: { ios: 'wallet-outline', android: 'wallet' },
  Wifi: { ios: 'wifi-outline', android: 'wifi' },
  WifiOff: { ios: 'cloud-offline-outline', android: 'wifi-off' },
  X: { ios: 'close', android: 'close' },
  XCircle: { ios: 'close-circle-outline', android: 'cancel' },
} as const satisfies Record<string, IconConfig>;

const FALLBACK_ICON: IconConfig = { ios: 'help-circle-outline', android: 'help-outline' };

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
  onLayout?: ComponentProps<typeof Ionicons>['onLayout'];
};

type ResolvedIcon = {
  name: IoniconName | MaterialIconName;
  family: IconFamily;
  isFallback: boolean;
};

export function resolveIcon(name: IconName | string, familyOverride?: IconFamily): ResolvedIcon {
  const family = familyOverride ?? (Platform.OS === 'ios' ? 'Ionicons' : 'MaterialIcons');
  const platformKey = family === 'Ionicons' ? 'ios' : 'android';
  const config = ICON_MAP[name as IconName];

  if (config) {
    return { name: config[platformKey], family, isFallback: false };
  }

  if (!familyOverride) {
    console.warn(`[Icon] Missing icon mapping for "${name}", falling back to help icon.`);
    return { name: FALLBACK_ICON[platformKey], family, isFallback: true };
  }

  return { name: name as IoniconName | MaterialIconName, family, isFallback: false };
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

  const baseSize = typeof size === 'number' ? size : theme.iconSizes[size] ?? theme.iconSizes.md;
  const platformSizeAdjustment = Platform.select({ ios: -1, android: 1, default: 0 }) ?? 0;
  const resolvedSize = Math.max(8, baseSize + platformSizeAdjustment);
  const resolvedColor =
    color ??
    (status && theme.colors.status[status]) ??
    Platform.select({
      ios: theme.colors.text,
      android: theme.colors.secondaryText ?? theme.colors.text,
      default: theme.colors.text,
    });

  const resolvedIcon = useMemo(() => {
    return resolveIcon(name, family);
  }, [family, name]);

  const IconComponent = resolvedIcon.family === 'MaterialIcons' ? MaterialIcons : Ionicons;

  return (
    <IconComponent
      allowFontScaling={allowFontScaling}
      accessibilityLabel={accessibilityLabel ?? `${name} icon`}
      accessibilityRole="image"
      color={resolvedColor as string}
      name={resolvedIcon.name as any}
      onLayout={onLayout}
      size={resolvedSize}
      style={style}
      testID={testID}
    />
  );
});

Icon.displayName = 'Icon';
