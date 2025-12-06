import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useLocalSearchParams, router } from 'expo-router';
import { SectionNav } from './SectionNav';
import { adminColors, adminRadius, adminSpace } from '@/styles/adminTheme';

type AdminShellProps = {
  title: string;
  children: React.ReactNode;
  onSignOut: () => void;
  navItems?: NavItem[];
};

type NavItem = { key: string; label: string; href: string; children?: NavItem[] };

const defaultNavItems: NavItem[] = [
  { key: 'metrics', label: 'Overview', href: '/admin/metrics' },
  {
    key: 'reviews',
    label: 'Reviews',
    href: '/admin/reviews',
    children: [
      { key: 'payments', label: 'Payments', href: '/admin/reviews?tab=payments' },
      { key: 'licenses', label: 'Licenses', href: '/admin/reviews?tab=licenses' },
      { key: 'photos', label: 'Menu photos', href: '/admin/reviews?tab=photos' },
    ],
  },
  { key: 'orders', label: 'Orders & Deliveries', href: '/admin/orders' },
  {
    key: 'payouts',
    label: 'Payouts',
    href: '/admin/payouts',
    children: [
      { key: 'balances', label: 'Balances', href: '/admin/payouts?section=balances' },
      { key: 'restaurant', label: 'Restaurant payables', href: '/admin/payouts?section=restaurant' },
      { key: 'driver', label: 'Driver payables', href: '/admin/payouts?section=driver' },
    ],
  },
  { key: 'analytics', label: 'Analytics', href: '/admin/analytics' },
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

export function AdminShell({ title, children, onSignOut, navItems = defaultNavItems }: AdminShellProps) {
  const pathname = usePathname();
  const params = useLocalSearchParams<{ tab?: string; section?: string }>();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;
  const activeItem = navItems.find(item => isActive(pathname, item));
  const childItems = activeItem?.children;
  const activeChildSection = typeof params.tab === 'string'
    ? params.tab
    : typeof params.section === 'string'
      ? params.section
      : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'left']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <SectionNav
          items={navItems}
          activeSection={pathname}
          onPress={href => router.replace(href as any)}
          scrollable={isNarrow}
        />
        {childItems && (
          <SectionNav
            items={childItems}
            activeSection={activeChildSection ?? pathname}
            onPress={href => router.replace(href as any)}
            scrollable={isNarrow}
            variant="sub"
          />
        )}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: adminColors.background },
  container: { flex: 1, backgroundColor: adminColors.background },
  header: {
    padding: adminSpace.lg,
    paddingTop: adminSpace.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '700', color: adminColors.text },
  signOutButton: {
    paddingHorizontal: adminSpace.md,
    paddingVertical: adminSpace.sm,
    borderRadius: adminRadius.md,
    backgroundColor: adminColors.primary,
  },
  signOutText: { color: '#fff', fontWeight: '600' },
  content: { padding: adminSpace.lg, paddingBottom: adminSpace.xl + adminSpace.md },
});
