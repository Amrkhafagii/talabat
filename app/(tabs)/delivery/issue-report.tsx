import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeDeliveries } from '@/hooks/useRealtimeDeliveries';
import { createDeliveryIssue } from '@/utils/db/deliveries';
import { getDriverByUserId } from '@/utils/database';

const REASONS = [
  { key: 'customer_not_available', label: 'Customer not available' },
  { key: 'incorrect_address', label: 'Incorrect address' },
  { key: 'damaged_items', label: 'Damaged item(s)' },
  { key: 'access_issue', label: 'Access issues' },
  { key: 'app_problem', label: 'App/technical problem' },
  { key: 'other', label: 'Other' },
];

const MAX_LEN = 250;

export default function IssueReport() {
  const theme = useRestaurantTheme();
  const { contentPadding } = useDeliveryLayout();
  const styles = useMemo(() => createStyles(theme, contentPadding.horizontal), [theme, contentPadding.horizontal]);
  const { deliveryId } = useLocalSearchParams<{ deliveryId?: string }>();
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const { deliveries } = useRealtimeDeliveries({ driverId: driverId ?? undefined, includeAvailable: false });
  const [reason, setReason] = useState<string>('customer_not_available');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState(
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

  const submit = async () => {
    if (!activeDelivery || !user) return;
    setSubmitting(true);
    try {
      const ok = await createDeliveryIssue({
        delivery_id: activeDelivery.id,
        order_id: activeDelivery.order_id,
        driver_id: activeDelivery.driver_id,
        user_id: user.id,
        reason_code: reason,
        details: details.trim() || null,
      });
      if (ok) {
        Alert.alert('Issue reported', 'We’ve logged this issue against the delivery.');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to submit report.');
      }
    } catch (err) {
      console.error('issue report error', err);
      Alert.alert('Error', 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Report Issue" showBackButton />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.orderLabel}>Order #{activeDelivery?.order_id?.slice(-6) || activeDelivery?.id?.slice(-6)}</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Icon name="X" size="md" color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subText}>For: {activeDelivery?.order?.user_id || 'Customer'}</Text>

          <Text style={styles.sectionTitle}>What&apos;s the issue?</Text>
          <View style={styles.reasonList}>
            {REASONS.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setReason(item.key)}
                style={[
                  styles.reasonRow,
                  reason === item.key && styles.reasonRowActive,
                ]}
              >
                <Text style={[styles.reasonText, reason === item.key && styles.reasonTextActive]}>
                  {item.label}
                </Text>
                <View style={[styles.radio, reason === item.key && styles.radioActive]} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Additional Details</Text>
          <View style={styles.textArea}>
            <TextInput
              value={details}
              onChangeText={(text) => setDetails(text.slice(0, MAX_LEN))}
              placeholder="Add more details (optional)"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.counter}>{details.length}/{MAX_LEN}</Text>
          </View>

          <Button
            title="Submit Report"
            onPress={submit}
            fullWidth
            pill
            disabled={!activeDelivery || submitting}
            style={styles.submitButton}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, horizontal: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: horizontal, paddingBottom: theme.insets.bottom + theme.spacing.lg },
    card: { padding: theme.spacing.lg, gap: theme.spacing.md },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    orderLabel: { ...theme.typography.titleM, color: theme.colors.text },
    subText: { ...theme.typography.caption, color: theme.colors.textMuted },
    sectionTitle: { ...theme.typography.subhead, color: theme.colors.text },
    reasonList: { gap: theme.spacing.xs },
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
    reasonRowActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
    reasonText: { ...theme.typography.body, color: theme.colors.text },
    reasonTextActive: { color: theme.colors.accent },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.colors.border },
    radioActive: { borderColor: theme.colors.accent, backgroundColor: `${theme.colors.accent}22` },
    textArea: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
      padding: theme.spacing.md,
      minHeight: 140,
    },
    input: { flex: 1, ...theme.typography.body, color: theme.colors.text },
    counter: { ...theme.typography.caption, color: theme.colors.textMuted, textAlign: 'right', marginTop: theme.spacing.xs },
    submitButton: { marginTop: theme.spacing.sm },
  });
