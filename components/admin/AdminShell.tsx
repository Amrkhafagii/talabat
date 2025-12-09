import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useLocalSearchParams, router } from 'expo-router';
import { SectionNav } from './SectionNav';
import { iosColors, iosSpacing, iosRadius, iosTypography } from '@/styles/iosTheme';
import { IOSHeaderBar } from '@/components/ios/IOSHeaderBar';
import { IOSBottomTabBar } from '@/components/ios/IOSBottomTabBar';
import { wp, hp } from '@/styles/responsive';
import { Icon } from '@/components/ui/Icon';
import { useAppTheme, type AppTheme } from '@/styles/appTheme';

type AdminShellProps = {
  title: string;
  children: React.ReactNode;
  onSignOut: () => void;
  navItems?: NavItem[];
  headerVariant?: 'default' | 'ios';
  headerLeadingAction?: HeaderAction;
  headerTrailingAction?: HeaderAction;
  headerDoneAction?: HeaderAction;
  bottomTabs?: BottomTab[];
  activeBottomTab?: string;
};

type NavItem = { key: string; label: string; href: string; children?: NavItem[] };
type HeaderAction = { label: string; onPress: () => void };
type BottomTab = { key: string; label: string; href?: string; icon?: React.ReactNode | ((active: boolean) => React.ReactNode); onPress?: () => void };

const defaultNavItems: NavItem[] = [
  { key: 'metrics', label: 'Overview', href: '/admin/metrics' },
  { key: 'analytics', label: 'Metrics', href: '/admin/analytics' },
  { key: 'reviews', label: 'Reviews', href: '/admin/reviews' },
  { key: 'orders', label: 'Orders & Deliveries', href: '/admin/orders' },
  { key: 'payouts', label: 'Payouts', href: '/admin/payouts' },
  { key: 'settings', label: 'Settings', href: '/admin/settings' },
];

function normalizeHref(href: string | undefined) {
  if (!href) return '';
  return href.split('?')[0].split('#')[0].replace(/\/+$/, '');
}

function isActive(pathname: string, item: NavItem) {
  const cleanedPath = pathname.replace(/\/+$/, '');
  const target = normalizeHref(item.href);
  return cleanedPath === target || cleanedPath.startsWith(target);
}

export function AdminShell({
  title,
  children,
  onSignOut,
  navItems = defaultNavItems,
  headerVariant = 'default',
  headerLeadingAction,
  headerTrailingAction,
  headerDoneAction,
  bottomTabs,
  activeBottomTab,
}: AdminShellProps) {
  const theme = useAppTheme();
  const colors = iosColors;
  const spacing = iosSpacing;
  const radius = iosRadius;
  const typography = iosTypography;
  const styles = useMemo(() => createStyles({ colors, spacing, radius, typography, theme }), [colors, spacing, radius, typography, theme]);

  const pathname = usePathname();
  const params = useLocalSearchParams<{ tab?: string; section?: string }>();
  const isNarrow = false;
  const activeItem = navItems.find(item => isActive(pathname, item));
  const childItems = activeItem?.children;
  const activeChildSection = typeof params.tab === 'string'
    ? params.tab
    : typeof params.section === 'string'
      ? params.section
      : null;

  const navVariant = headerVariant === 'ios' ? 'ios' : 'primary';
  const subNavVariant = headerVariant === 'ios' ? 'ios-sub' : 'sub';

  const resolvedBottomTabs = useMemo(
    () => bottomTabs ?? (headerVariant === 'ios' ? buildDefaultBottomTabs(colors) : undefined),
    [bottomTabs, headerVariant, colors]
  );
  const activeTabKey = resolvedBottomTabs
    ? resolvedBottomTabs.find((tab) => pathname.startsWith(tab.href ?? ''))?.key ?? activeBottomTab ?? ''
    : activeBottomTab;

  const renderHeader = () => {
    if (headerVariant === 'ios') {
      return (
        <IOSHeaderBar
          title={title}
          leadingAction={headerLeadingAction}
          trailingAction={headerTrailingAction}
          doneAction={headerDoneAction || { label: 'Sign out', onPress: onSignOut }}
        />
      );
    }
    return (
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, headerVariant === 'ios' && styles.iosSafeArea]} edges={['top', 'right', 'left', 'bottom']}>
      <View style={[styles.container, headerVariant === 'ios' && styles.iosContainer]}>
        {renderHeader()}

        <SectionNav
          items={navItems}
          activeSection={pathname}
          onPress={href => router.replace(href as any)}
          scrollable={isNarrow}
          variant={navVariant as any}
        />
        {childItems && (
          <SectionNav
            items={childItems}
            activeSection={activeChildSection ?? pathname}
            onPress={href => router.replace(href as any)}
            scrollable={isNarrow}
            variant={subNavVariant as any}
          />
        )}

        <ScrollView
          contentContainerStyle={[
            styles.content,
            headerVariant === 'ios' ? styles.iosContent : null,
            resolvedBottomTabs ? { paddingBottom: hp('8%') } : null,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
      {resolvedBottomTabs && resolvedBottomTabs.length > 0 && (
        <IOSBottomTabBar
          items={resolvedBottomTabs.map((tab) => ({
            ...tab,
            onPress: tab.onPress || (() => tab.href && router.replace(tab.href as any)),
          }))}
          activeKey={activeTabKey || pathname}
        />
      )}
    </SafeAreaView>
  );
}

function buildDefaultBottomTabs(colors: typeof iosColors): BottomTab[] {
  return [
    { key: 'metrics', label: 'Overview', href: '/admin/metrics', icon: (active: boolean) => <Icon name="LayoutDashboard" size={20} color={active ? colors.primary : colors.secondaryText} /> },
    { key: 'analytics', label: 'Metrics', href: '/admin/analytics', icon: (active: boolean) => <Icon name="BarChart3" size={20} color={active ? colors.primary : colors.secondaryText} /> },
    { key: 'reviews', label: 'Reviews', href: '/admin/reviews', icon: (active: boolean) => <Icon name="ClipboardList" size={20} color={active ? colors.primary : colors.secondaryText} /> },
    { key: 'orders', label: 'Orders', href: '/admin/orders', icon: (active: boolean) => <Icon name="Truck" size={20} color={active ? colors.primary : colors.secondaryText} /> },
    { key: 'payouts', label: 'Payouts', href: '/admin/payouts', icon: (active: boolean) => <Icon name="CreditCard" size={20} color={active ? colors.primary : colors.secondaryText} /> },
    { key: 'settings', label: 'Settings', href: '/admin/settings', icon: (active: boolean) => <Icon name="Settings" size={20} color={active ? colors.primary : colors.secondaryText} /> },
  ];
}

function createStyles({
  colors,
  spacing,
  radius,
  typography,
  theme,
}: {
  colors: typeof iosColors;
  spacing: typeof iosSpacing;
  radius: typeof iosRadius;
  typography: typeof iosTypography;
  theme: AppTheme;
}) {
  const inverseText = theme.colors.textInverse || '#fff';

  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    iosSafeArea: { backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    iosContainer: { backgroundColor: colors.background },
    header: {
      padding: Math.max(spacing.lg, hp('2.5%')),
      paddingTop: Math.max(spacing.xl, hp('3%')),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { ...(typography.title2 || {}), color: colors.text },
    signOutButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    signOutText: { color: inverseText, fontWeight: '600' },
    content: { padding: Math.max(spacing.lg, wp('5%')), paddingBottom: Math.max(spacing.xl, hp('3%')) },
    iosContent: {
      paddingHorizontal: Math.max(spacing.lg, wp('5%')),
      paddingTop: Math.max(spacing.lg, hp('2.5%')),
      paddingBottom: Math.max(spacing.xl, hp('3%')),
    },
  });
}
