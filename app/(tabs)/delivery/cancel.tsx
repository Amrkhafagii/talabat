import React, { useMemo, useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeDeliveries } from '@/hooks/useRealtimeDeliveries';
import { updateDeliveryStatus } from '@/utils/db/deliveries';
import { createDeliveryEvent } from '@/utils/db/trustedArrival';
import { getDriverByUserId } from '@/utils/database';
import { Delivery } from '@/types/database';

const REASONS = [
  { key: 'too_long', label: 'Excessive wait time' },
  { key: 'restaurant_issue', label: 'Restaurant issue' },
  { key: 'customer_unreachable', label: 'Customer unreachable' },
  { key: 'safety', label: 'Safety concern' },
  { key: 'other', label: 'Other' },
];

export default function CancelDeliveryScreen() {
  const theme = useRestaurantTheme();
  const { contentPadding } = useDeliveryLayout();
  const styles = useMemo(() => createStyles(theme, contentPadding.horizontal), [theme, contentPadding.horizontal]);
  const { deliveryId } = useLocalSearchParams<{ deliveryId?: string }>();
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const { deliveries } = useRealtimeDeliveries({ driverId: driverId ?? undefined, includeAvailable: false });
  const [selectedReason, setSelectedReason] = useState<string>('too_long');
  const [submitting, setSubmitting] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(() =>
    deliveries.find((d) => (deliveryId ? d.id === deliveryId : ['assigned', 'picked_up', 'on_the_way'].includes(d.status))) || null
  );

  useEffect(() => {
    const loadDriver = async () => {
      if (!user) return;
      const driver = await getDriverByUserId(user.id);
      setDriverId(driver?.id ?? null);
    };
    loadDriver();
  }, [user]);

  useEffect(() => {
    const next = deliveries.find((d) => (deliveryId ? d.id === deliveryId : ['assigned', 'picked_up', 'on_the_way'].includes(d.status)));
    setActiveDelivery(next || null);
  }, [deliveries, deliveryId]);

  const handleCancel = async () => {
    if (!activeDelivery || !user) return;
    setSubmitting(true);
    try {
      const ok = await updateDeliveryStatus(activeDelivery.id, 'cancelled', {
        cancellationReasonCode: selectedReason,
      });
      if (ok) {
        await createDeliveryEvent({
          delivery_id: activeDelivery.id,
          order_id: activeDelivery.order_id,
          actor: 'driver',
          actor_id: user.id,
          type: 'cancelled',
          payload: { reason: selectedReason },
        } as any);
        Alert.alert('Order cancelled', 'The delivery has been cancelled.');
        router.replace('/(tabs)/delivery');
      } else {
        Alert.alert('Error', 'Unable to cancel the order.');
      }
    } catch (err) {
      console.error('cancel order error', err);
      Alert.alert('Error', 'Unable to cancel the order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.overlay}>
      <Header title="Cancel Order?" showBackButton />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.indicator} />
          <View style={styles.iconWrap}>
            <Icon name="AlertTriangle" size={32} color={theme.colors.status.error} />
          </View>
          <Text style={styles.title}>Cancel Order?</Text>
          <Text style={styles.subtitle}>
            Are you sure you want to cancel this delivery? This action cannot be undone.
          </Text>

          {activeDelivery ? (
            <View style={styles.detailBlock}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <Text style={styles.detailValue}>#{activeDelivery.order_id?.slice(-6) || activeDelivery.id.slice(-6)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pickup Location</Text>
                <Text style={styles.detailValue}>{activeDelivery.pickup_address || 'Unknown'}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.detailLabel}>No active delivery found.</Text>
          )}

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>This will affect your account</Text>
            <Text style={styles.warningText}>
              Your acceptance rate will be lowered and this may impact your eligibility for bonuses.
            </Text>
          </View>

          <View style={styles.reasonList}>
            <Text style={styles.sectionTitle}>Reason</Text>
            {REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.key}
                onPress={() => setSelectedReason(reason.key)}
                style={[
                  styles.reasonRow,
                  selectedReason === reason.key && styles.reasonRowActive,
                ]}
              >
                <Text style={[styles.reasonText, selectedReason === reason.key && styles.reasonTextActive]}>
                  {reason.label}
                </Text>
                {selectedReason === reason.key ? (
                  <View style={[styles.radio, styles.radioActive]} />
                ) : (
                  <View style={styles.radio} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <Button
              title="Yes, Cancel Order"
              variant="danger"
              onPress={handleCancel}
              disabled={!activeDelivery || submitting}
              fullWidth
              pill
            />
            <Button
              title="Go Back"
              variant="secondary"
              onPress={() => router.back()}
              fullWidth
              pill
              style={styles.goBack}
              textStyle={{ color: theme.colors.text }}
            />
          </View>
        </Card>
      </ScrollView>
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <Icon name="X" size="md" color={theme.colors.text} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, horizontal: number) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      padding: horizontal,
      paddingBottom: theme.insets.bottom + theme.spacing.lg,
    },
    card: {
      borderRadius: theme.radius.card,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.card,
      gap: theme.spacing.sm,
    },
    indicator: {
      width: 48,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      backgroundColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignSelf: 'center',
      backgroundColor: `${theme.colors.status.error}11`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: { ...theme.typography.titleM, textAlign: 'center', color: theme.colors.text },
    subtitle: { ...theme.typography.body, textAlign: 'center', color: theme.colors.textMuted },
    detailBlock: { marginTop: theme.spacing.md, gap: theme.spacing.xs },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    detailLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
    detailValue: { ...theme.typography.body, color: theme.colors.text },
    warningBox: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.statusSoft.warning,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.status.warning,
      gap: theme.spacing.xs,
    },
    warningTitle: { ...theme.typography.subhead, color: theme.colors.status.warning },
    warningText: { ...theme.typography.caption, color: theme.colors.status.warning },
    reasonList: { marginTop: theme.spacing.md, gap: theme.spacing.xs },
    sectionTitle: { ...theme.typography.subhead, color: theme.colors.text },
    reasonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
    },
    reasonRowActive: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[100],
    },
    reasonText: { ...theme.typography.body, color: theme.colors.text },
    reasonTextActive: { color: theme.colors.primary[500] },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    radioActive: { borderColor: theme.colors.primary[500], backgroundColor: `${theme.colors.primary[500]}22` },
    actions: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
    goBack: { backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
    close: {
      position: 'absolute',
      top: theme.insets.top + theme.spacing.sm,
      right: theme.spacing.lg,
      padding: theme.spacing.sm,
    },
  });
