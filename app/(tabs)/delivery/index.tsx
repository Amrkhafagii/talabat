import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';
import { useDeliveryDashboard } from '@/hooks/useDeliveryDashboard';
import { DashboardHeader } from '@/components/delivery/DashboardHeader';
import { DashboardStatsGrid } from '@/components/delivery/DashboardStatsGrid';
import { DashboardQuickActions } from '@/components/delivery/DashboardQuickActions';
import { ActiveDeliverySection } from '@/components/delivery/ActiveDeliverySection';
import { AvailableOffersSection } from '@/components/delivery/AvailableOffersSection';
import { OfflineState } from '@/components/delivery/OfflineState';
import { OfferUnavailableModal } from '@/components/delivery/OfferUnavailableModal';

export default function DeliveryDashboard() {
  const theme = useRestaurantTheme();
  const { contentPadding, sectionGap } = useDeliveryLayout();
  const {
    driver,
    stats,
    loading,
    refreshing,
    error,
    offerUnavailable,
    setOfferUnavailable,
    deliveries,
    availableDeliveries,
    deliveriesLoading,
    deliveriesError,
    handleRefresh,
    toggleOnlineStatus,
    handleAcceptDelivery,
    handleUpdateDeliveryStatus,
    callCustomer,
    navigateToDelivery,
    formatDeliveryForCard,
  } = useDeliveryDashboard();
  const styles = useMemo(() => createStyles(theme, contentPadding, sectionGap), [theme, contentPadding, sectionGap]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading delivery dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !driver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Driver profile not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader
        driverName={driver.user?.full_name}
        orderIdLabel={deliveries[0]?.order_id?.slice(-6).toUpperCase()}
        isOnline={driver.is_online}
        onToggleOnline={toggleOnlineStatus}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
      >
        <DashboardStatsGrid stats={stats} paddingHorizontal={contentPadding.horizontal} />

        <DashboardQuickActions
          paddingHorizontal={contentPadding.horizontal}
          actions={[
            { icon: 'Navigation', label: 'Navigate', onPress: () => router.push('/delivery/navigation') },
            { icon: 'History', label: 'History', onPress: () => router.push('/delivery/history') },
            { icon: 'BarChart3', label: 'Earnings', onPress: () => router.push('/delivery/earnings') },
            { icon: 'Wallet', label: 'Cash Recon', onPress: () => router.push('/delivery/cash-reconciliation') },
            { icon: 'MapPin', label: 'Feedback', onPress: () => router.push('/delivery/feedback') },
            { icon: 'MapPin', label: 'Profile', onPress: () => router.push('/delivery/profile') },
          ]}
        />

        {deliveries.length > 0 && (
          <ActiveDeliverySection
            deliveries={deliveries}
            paddingHorizontal={contentPadding.horizontal}
            onReport={deliveryId => router.push({ pathname: '/(tabs)/delivery/issue-report', params: { deliveryId } } as any)}
            onCancel={deliveryId => router.push({ pathname: '/(tabs)/delivery/cancel', params: { deliveryId } } as any)}
            onCall={callCustomer}
            onNavigate={navigateToDelivery}
            onPickup={deliveryId => handleUpdateDeliveryStatus(deliveryId, 'picked_up')}
            onComplete={deliveryId => handleUpdateDeliveryStatus(deliveryId, 'delivered')}
            formatDeliveryForCard={formatDeliveryForCard}
          />
        )}

        {driver.is_online && deliveries.length === 0 && (
          <AvailableOffersSection
            paddingHorizontal={contentPadding.horizontal}
            loading={deliveriesLoading}
            availableDeliveries={availableDeliveries}
            error={deliveriesError}
            onAccept={handleAcceptDelivery}
            formatDeliveryForCard={formatDeliveryForCard}
          />
        )}

        {!driver.is_online && <OfflineState />}
      </ScrollView>

      <OfferUnavailableModal
        visible={Boolean(offerUnavailable)}
        onClose={() => setOfferUnavailable(null)}
        onRefresh={handleRefresh}
      />
    </SafeAreaView>
  );
}

const createStyles = (
  theme: ReturnType<typeof useRestaurantTheme>,
  contentPadding: { horizontal: number; top: number; bottom: number },
  _sectionGap: number
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: contentPadding.horizontal,
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.sm,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: contentPadding.horizontal,
    },
    errorText: {
      ...theme.typography.body,
      color: theme.colors.status.error,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    retryButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
    },
    retryButtonText: {
      ...theme.typography.button,
      color: theme.colors.textInverse,
    },
  });
