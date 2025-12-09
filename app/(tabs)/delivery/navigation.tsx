import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';
import CtaBar from '@/components/ui/CtaBar';
import { useDeliveryNavigation } from '@/hooks/useDeliveryNavigation';
import { NavigationStatusCard } from '@/components/delivery/NavigationStatusCard';
import { DestinationCard } from '@/components/delivery/DestinationCard';
import { NavigationOrderSummary } from '@/components/delivery/NavigationOrderSummary';

export default function DeliveryNavigation() {
  const theme = useRestaurantTheme();
  const { contentPadding } = useDeliveryLayout();
  const [summaryOpen, setSummaryOpen] = useState(true);
  const {
    activeDelivery,
    currentDestination,
    loading,
    normalizedStatus,
    stepStatusFor,
    openInGoogleMaps,
    openInAppleMaps,
    openInWaze,
    callCustomer,
    confirmMarkPickedUp,
    markDelivered,
  } = useDeliveryNavigation();
  const styles = useMemo(() => createStyles(theme, contentPadding), [theme, contentPadding]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Navigation" showBackButton />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeDelivery || !currentDestination) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Navigation" showBackButton />
        <View style={styles.emptyState}>
          <Icon name="Navigation" size={64} color={theme.colors.textSubtle} />
          <Text style={styles.emptyTitle}>No Active Delivery</Text>
          <Text style={styles.emptyText}>
            Accept a delivery to start navigation
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Navigation" showBackButton />

      <View style={styles.content}>
        <NavigationStatusCard normalizedStatus={normalizedStatus} stepStatusFor={stepStatusFor} />

        <DestinationCard
          destination={currentDestination}
          onGoogle={() => openInGoogleMaps(currentDestination.address, currentDestination.latitude, currentDestination.longitude)}
          onApple={Platform.OS === 'ios' ? () => openInAppleMaps(currentDestination.address) : undefined}
          onWaze={() => openInWaze(currentDestination.address)}
        />

        <NavigationOrderSummary
          orderNumber={activeDelivery.order?.order_number || `#${activeDelivery.id.slice(-6).toUpperCase()}`}
          restaurantName={activeDelivery.order?.restaurant?.name}
          earnings={activeDelivery.driver_earnings}
          distanceKm={activeDelivery.distance_km}
          items={(activeDelivery.order?.order_items || []).map(item => ({
            id: item.id,
            name: item.menu_item?.name,
            quantity: item.quantity,
          }))}
          expanded={summaryOpen}
          onToggle={() => setSummaryOpen(prev => !prev)}
          showCall={currentDestination.type === 'delivery'}
          onCall={currentDestination.type === 'delivery' ? callCustomer : undefined}
        />
      </View>

      <CtaBar
        label={
          activeDelivery.status === 'assigned'
            ? 'Mark as Picked Up'
            : activeDelivery.status === 'picked_up' || activeDelivery.status === 'on_the_way'
              ? 'Mark as Delivered'
              : 'Delivered'
        }
        onPress={
          activeDelivery.status === 'assigned'
            ? confirmMarkPickedUp
            : activeDelivery.status === 'picked_up' || activeDelivery.status === 'on_the_way'
              ? markDelivered
              : () => {}
        }
        disabled={
          !(
            activeDelivery.status === 'assigned' ||
            activeDelivery.status === 'picked_up' ||
            activeDelivery.status === 'on_the_way'
          )
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (
  theme: ReturnType<typeof useRestaurantTheme>,
  contentPadding: { horizontal: number; top: number; bottom: number }
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
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: contentPadding.horizontal,
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
    },
    emptyText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: contentPadding.horizontal,
      paddingTop: theme.spacing.md,
    },
  });
