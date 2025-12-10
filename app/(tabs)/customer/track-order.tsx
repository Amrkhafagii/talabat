import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useTrackOrder } from '@/hooks/useTrackOrder';
import { TrackOrderStatusCard } from '@/components/customer/TrackOrderStatusCard';
import { TrackOrderDelayCard } from '@/components/customer/TrackOrderDelayCard';
import { TrackOrderProgress } from '@/components/customer/TrackOrderProgress';

export default function TrackOrder() {
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;

  const {
    order,
    displayStatus,
    money,
    driverLocation,
    delayReason,
    creditStatus,
    backupPlan,
    rerouteStatus,
    safetyEvents,
    etaAlert,
    loading,
    error,
    getCurrentStepIndex,
    openDriverInMaps,
    callRestaurant,
    callDriver,
    etaDetails,
    handleAcceptDelayCredit,
    handleApproveReroute,
    handleDeclineReroute,
    getOrderItems,
  } = useTrackOrder(orderId);
  const { etaWindow, showTrustedEta } = etaDetails;
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const receiptUrl = order?.receipt_url || order?.payment_proof_url || null;
  const mapLat = (driverLocation?.latitude || order?.delivery?.driver?.current_latitude) ?? null;
  const mapLng = (driverLocation?.longitude || order?.delivery?.driver?.current_longitude) ?? null;
  const staticMapUrl =
    mapLat && mapLng && process.env.EXPO_PUBLIC_MAPS_API_KEY
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${mapLat},${mapLng}&zoom=14&size=600x300&markers=color:orange%7C${mapLat},${mapLng}&key=${process.env.EXPO_PUBLIC_MAPS_API_KEY}`
      : null;
  const hasMapPreview = Boolean(mapLat && mapLng);

  const openReceipt = useCallback(() => {
    if (!receiptUrl) {
      Alert.alert('Receipt', 'Receipt is not available yet.');
      return;
    }
    Linking.openURL(receiptUrl).catch(() => {
      Alert.alert('Receipt', 'Unable to open receipt right now.');
    });
  }, [receiptUrl]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Track Order" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Track Order" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const driver = order.delivery?.driver;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Track Order"
        showBackButton
        rightComponent={<RealtimeIndicator />}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TrackOrderStatusCard
          orderId={order.id}
          restaurantName={order.restaurant?.name}
          createdAt={order.created_at}
          status={displayStatus || order.status}
          etaWindow={etaWindow}
          showTrustedEta={showTrustedEta}
          etaAlert={etaAlert}
          safetyEvents={safetyEvents}
          estimatedDelivery={order.estimated_delivery_time}
        />

        {delayReason && (
          <TrackOrderDelayCard
            delayReason={delayReason}
            creditStatus={creditStatus}
            backupPlan={backupPlan}
            rerouteStatus={rerouteStatus}
            onAcceptCredit={handleAcceptDelayCredit}
            onApproveReroute={handleApproveReroute}
            onDeclineReroute={handleDeclineReroute}
          />
        )}

        <TrackOrderProgress currentStepIndex={currentStepIndex} />

        {hasMapPreview && (
          <Card style={styles.mapCard}>
            {staticMapUrl ? (
              <Image source={{ uri: staticMapUrl }} style={styles.mapPreview} resizeMode="cover" />
            ) : (
              <View style={styles.mapCompact}>
                <Icon name="MapPinFill" size="lg" color={theme.colors.primary[500]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapText}>Driver location locked</Text>
                  <Text style={styles.mapCoords}>
                    {mapLat?.toFixed(4)}, {mapLng?.toFixed(4)}
                  </Text>
                </View>
              </View>
            )}
            <Button title="Open Maps" onPress={openDriverInMaps} variant="outline" />
          </Card>
        )}

        {/* Driver Information */}
        {driver && ['picked_up', 'on_the_way'].includes(order.status) && (
          <Card style={styles.driverCard}>
            <Text style={styles.sectionTitle}>Your Driver</Text>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Icon name="User" size="md" color={theme.colors.primary[500]} />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>
                  {driver.user?.full_name || 'Driver'}
                </Text>
                <Text style={styles.driverRating}>
                  ⭐ {driver.rating.toFixed(1)} • {driver.total_deliveries} deliveries
                </Text>
                <Text style={styles.driverVehicle}>
                  {driver.vehicle_type.charAt(0).toUpperCase() + driver.vehicle_type.slice(1)}
                  {driver.vehicle_color && ` • ${driver.vehicle_color}`}
                </Text>
              </View>
              <View style={styles.driverActions}>
                <TouchableOpacity style={styles.driverChip} onPress={callDriver}>
                  <Icon name="Phone" size="sm" color={theme.colors.primary[500]} />
                  <Text style={styles.driverChipText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.driverChipSecondary}>
                  <Icon name="MessageCircle" size="sm" color={theme.colors.textMuted} />
                  <Text style={styles.driverChipMuted}>Message</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Live location */}
            {(driverLocation || driver.current_latitude) && (
              <View style={styles.liveLocation}>
                <View style={styles.liveLocationText}>
                  <Text style={styles.liveLocationLabel}>Live location</Text>
                  <Text style={styles.liveLocationValue}>
                    {(
                      driverLocation?.latitude || driver.current_latitude
                    )?.toFixed(4)}
                    ,{' '}
                    {(
                      driverLocation?.longitude || driver.current_longitude
                    )?.toFixed(4)}
                  </Text>
                  {driverLocation?.updatedAt && (
                    <Text style={styles.liveLocationMeta}>
                      Updated {new Date(driverLocation.updatedAt).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
                <Button
                  title="Open in Maps"
                  onPress={openDriverInMaps}
                  size="small"
                  variant="secondary"
                />
              </View>
            )}
          </Card>
        )}

        {/* Order Items */}
        <Card style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsList}>
            {getOrderItems(order).map((item, index) => (
              <Text key={index} style={styles.orderItem}>• {item}</Text>
            ))}
          </View>
          <View style={styles.chargeBreakdown}>
            {[
              { label: 'Subtotal', value: order.subtotal },
              { label: 'Delivery', value: order.delivery_fee },
              { label: 'Tax', value: order.tax_amount },
              { label: 'Tip', value: order.tip_amount },
              { label: 'Platform fee', value: order.platform_fee },
            ].map(row => (
              <View key={row.label} style={styles.chargeRow}>
                <Text style={styles.chargeLabel}>{row.label}</Text>
                <Text style={styles.chargeValue}>{money(row.value)}</Text>
              </View>
              ))}
            <View style={styles.chargeDivider} />
            <View style={styles.chargeRow}>
              <Text style={styles.chargeTotalLabel}>Total charged</Text>
              <Text style={styles.chargeTotalValue}>{money(order.total_charged ?? order.total)}</Text>
            </View>
          </View>
          <View style={styles.receiptRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionSubtitle}>Receipt</Text>
              <Text style={styles.receiptHelper}>
                {receiptUrl ? 'Preview your payment receipt below.' : 'Receipt will appear once payment is processed.'}
              </Text>
            </View>
            <Button
              title="Open Receipt"
              onPress={openReceipt}
              variant="outline"
              size="small"
              disabled={!receiptUrl}
            />
          </View>
          {receiptUrl ? (
            <Image source={{ uri: receiptUrl }} style={styles.receiptPreview} resizeMode="cover" />
          ) : null}
          <View style={styles.supportActions}>
            <Button title="Contact Support" onPress={callRestaurant} variant="outline" style={styles.supportButton} />
            <Button
              title={receiptUrl ? 'View Receipt' : 'Receipt Pending'}
              onPress={openReceipt}
              variant="outline"
              style={styles.supportButton}
              disabled={!receiptUrl}
            />
          </View>
        </Card>

        {/* Delivery Address */}
        <Card style={styles.addressCard}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressInfo}>
            <Icon name="MapPinFill" size="md" color={theme.colors.primary[500]} />
            <Text style={styles.addressText}>{order.delivery_address}</Text>
          </View>
          {order.delivery_instructions && (
            <Text style={styles.deliveryInstructions}>
              Instructions: {order.delivery_instructions}
            </Text>
          )}
        </Card>

        {/* Contact Actions */}
        <Card style={styles.contactCard}>
          <Text style={styles.sectionTitle}>Need Help?</Text>
          <View style={styles.contactActions}>
            <Button
              title="Call Restaurant"
              onPress={callRestaurant}
              variant="outline"
              style={styles.contactButton}
            />
            {driver && (
              <Button
                title="Call Driver"
                onPress={callDriver}
                variant="outline"
                style={styles.contactButton}
              />
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginTop: 12,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    sectionSubtitle: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 2,
    },
    mapCard: {
      marginBottom: 16,
      gap: 12,
    },
    mapPreview: {
      height: 160,
      borderRadius: theme.radius.card,
      width: '100%',
    },
    mapCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.card,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    mapText: { fontFamily: 'Inter-Medium', color: theme.colors.textMuted },
    mapCoords: { fontFamily: 'Inter-SemiBold', color: theme.colors.text },
    driverCard: {
      marginBottom: 16,
    },
    driverInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    driverAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary[100],
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    driverDetails: {
      flex: 1,
    },
    driverActions: {
      gap: 8,
      flexDirection: 'row',
    },
    driverChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary[50],
    },
    driverChipSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceAlt,
    },
    driverChipText: { fontFamily: 'Inter-SemiBold', color: theme.colors.primary[600], fontSize: 13 },
    driverChipMuted: { fontFamily: 'Inter-SemiBold', color: theme.colors.textMuted, fontSize: 13 },
    liveLocation: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    liveLocationText: {
      flex: 1,
    },
    liveLocationLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Medium',
    },
    liveLocationValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-SemiBold',
    },
    liveLocationMeta: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginTop: 2,
    },
    driverName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 2,
    },
    driverRating: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginBottom: 2,
    },
    driverVehicle: {
      fontSize: 12,
      color: theme.colors.textSubtle,
      fontFamily: 'Inter-Regular',
    },
    itemsCard: {
      marginBottom: 16,
    },
    itemsList: {
      marginBottom: 16,
    },
    orderItem: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
      marginBottom: 4,
    },
    chargeBreakdown: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
      gap: 6,
    },
    chargeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chargeLabel: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
    },
    chargeValue: {
      fontSize: 13,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    chargeDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 4,
    },
    chargeTotalLabel: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    chargeTotalValue: {
      fontSize: 14,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
    },
    receiptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
      marginBottom: 8,
    },
    receiptHelper: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
    },
    receiptPreview: {
      width: '100%',
      height: 160,
      borderRadius: theme.radius.card,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    supportActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    supportButton: { flex: 1 },
    addressCard: {
      marginBottom: 16,
    },
    addressInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-Regular',
      marginLeft: 8,
      flex: 1,
      lineHeight: 20,
    },
    deliveryInstructions: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      fontStyle: 'italic',
      marginTop: 8,
      paddingLeft: 28,
    },
    contactCard: {
      marginBottom: 32,
    },
    contactActions: {
      flexDirection: 'row',
      gap: 12,
    },
    contactButton: {
      flex: 1,
    },
    refundBox: {
      backgroundColor: theme.colors.statusSoft.warning,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
    },
    refundText: {
      color: theme.colors.status.warning,
      marginBottom: 8,
      fontFamily: 'Inter-Regular',
    },
    refundButton: {
      marginTop: 4,
    },
    refundStatus: {
      color: theme.colors.textMuted,
      marginTop: 6,
      fontFamily: 'Inter-Regular',
    },
  });
