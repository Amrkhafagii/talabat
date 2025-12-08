import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useLocalSearchParams, router } from 'expo-router';
import { SectionNav } from './SectionNav';
import { iosColors, iosSpacing, iosRadius, iosTypography } from '@/styles/iosTheme';
import { IOSHeaderBar } from '@/components/ios/IOSHeaderBar';
import { IOSBottomTabBar } from '@/components/ios/IOSBottomTabBar';
import { wp, hp } from '@/styles/responsive';
import { Icon } from '@/components/ui/Icon';

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

const defaultBottomTabs: BottomTab[] = [
  { key: 'metrics', label: 'Overview', href: '/admin/metrics', icon: (active: boolean) => <Icon name="LayoutDashboard" size={20} color={active ? iosColors.primary : iosColors.secondaryText} /> },
  { key: 'analytics', label: 'Metrics', href: '/admin/analytics', icon: (active: boolean) => <Icon name="BarChart3" size={20} color={active ? iosColors.primary : iosColors.secondaryText} /> },
  { key: 'reviews', label: 'Reviews', href: '/admin/reviews', icon: (active: boolean) => <Icon name="ClipboardList" size={20} color={active ? iosColors.primary : iosColors.secondaryText} /> },
  { key: 'orders', label: 'Orders', href: '/admin/orders', icon: (active: boolean) => <Icon name="Truck" size={20} color={active ? iosColors.primary : iosColors.secondaryText} /> },
  { key: 'payouts', label: 'Payouts', href: '/admin/payouts', icon: (active: boolean) => <Icon name="CreditCard" size={20} color={active ? iosColors.primary : iosColors.secondaryText} /> },
  { key: 'settings', label: 'Settings', href: '/admin/settings', icon: (active: boolean) => <Icon name="Settings" size={20} color={active ? iosColors.primary : iosColors.secondaryText} /> },
];

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

  const resolvedBottomTabs = bottomTabs ?? (headerVariant === 'ios' ? defaultBottomTabs : undefined);
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iosColors.background },
  iosSafeArea: { backgroundColor: iosColors.background },
  container: { flex: 1, backgroundColor: iosColors.background },
  iosContainer: { backgroundColor: iosColors.background },
  header: {
    padding: Math.max(iosSpacing.lg, hp('2.5%')),
    paddingTop: Math.max(iosSpacing.xl, hp('3%')),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...iosTypography.title2, color: iosColors.text },
  signOutButton: {
    paddingHorizontal: iosSpacing.md,
    paddingVertical: iosSpacing.xs + 2,
    borderRadius: iosRadius.md,
    backgroundColor: iosColors.primary,
  },
  signOutText: { color: '#fff', fontWeight: '600' },
  content: { padding: Math.max(iosSpacing.lg, wp('5%')), paddingBottom: Math.max(iosSpacing.xl, hp('3%')) },
  iosContent: {
    paddingHorizontal: Math.max(iosSpacing.lg, wp('5%')),
    paddingTop: Math.max(iosSpacing.lg, hp('2.5%')),
    paddingBottom: Math.max(iosSpacing.xl, hp('3%')),
  },
});
