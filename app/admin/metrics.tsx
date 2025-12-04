import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CopyChip from '../components/CopyChip';
import * as Clipboard from 'expo-clipboard';
import {
  getTrustedArrivalMetrics,
  runKillSwitch,
  runPopulateMetrics,
  getTrustedRolloutConfig,
  upsertTrustedRolloutConfig,
  getPaymentReviewQueue,
  approvePaymentReview,
  rejectPaymentReview,
  getRestaurantPayablesPending,
  getDriverPayablesPending,
  submitPaymentProofManual,
  markRestaurantPayoutManual,
  markDriverPayoutManual,
  getOrderAdminDetail,
  getOpsAlertsSnapshot,
  reconcileSettlementImport,
  retryRestaurantPayout,
  retryDriverPayout,
  getOpsPlaybook,
  retryDuePayouts,
  getSettlementReport,
  getAgingPayables,
} from '@/utils/database';
import type { TrustedArrivalMetrics } from '@/utils/db/metrics';
import type { TrustedRolloutConfig } from '@/utils/db/config';
import type {
  PaymentReviewItem,
  RestaurantPayable,
  DriverPayable,
  OrderAdminDetail,
  OpsAlertsSnapshot,
  OpsPlaybook,
  SettlementReport,
  AgingPayable,
} from '@/utils/db/adminOps';

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState<TrustedArrivalMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [config, setConfig] = useState<TrustedRolloutConfig | null>(null);
  const [subsText, setSubsText] = useState('');
  const [rerouteText, setRerouteText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [refreshingMetrics, setRefreshingMetrics] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<PaymentReviewItem[]>([]);
  const [restaurantPayables, setRestaurantPayables] = useState<RestaurantPayable[]>([]);
  const [driverPayables, setDriverPayables] = useState<DriverPayable[]>([]);
  const [opsLoading, setOpsLoading] = useState(true);
  const [opsStatus, setOpsStatus] = useState<string | null>(null);
  const [restFilter, setRestFilter] = useState({ restaurantId: '', status: '', payoutRef: '', createdAfter: '', createdBefore: '' });
  const [driverFilter, setDriverFilter] = useState({ driverId: '', status: '', payoutRef: '', createdAfter: '', createdBefore: '' });
  const [paymentProofForm, setPaymentProofForm] = useState({ orderId: '', txnId: '', amount: '', receiptUrl: '' });
  const [paymentProofStatus, setPaymentProofStatus] = useState<string | null>(null);
  const [payoutForm, setPayoutForm] = useState({
    orderId: '',
    scope: 'restaurant' as 'restaurant' | 'driver',
    payoutRef: '',
    driverId: '',
    success: true,
    errorNote: '',
  });
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState({ proof: false, payout: false });
  const [adminOrderId, setAdminOrderId] = useState('');
  const [adminOrderDetail, setAdminOrderDetail] = useState<OrderAdminDetail | null>(null);
  const [adminDetailStatus, setAdminDetailStatus] = useState<string | null>(null);
  const [opsAlerts, setOpsAlerts] = useState<OpsAlertsSnapshot | null>(null);
  const [reconInput, setReconInput] = useState('');
  const [reconStatus, setReconStatus] = useState<string | null>(null);
  const [reconResults, setReconResults] = useState<any[]>([]);
  const [opsPlaybook, setOpsPlaybook] = useState<OpsPlaybook | null>(null);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [settlementDays, setSettlementDays] = useState('1');
  const [settlementReport, setSettlementReport] = useState<SettlementReport | null>(null);
  const [agingHours, setAgingHours] = useState('24');
  const [agingPayables, setAgingPayables] = useState<AgingPayable[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getTrustedArrivalMetrics(7);
      setMetrics(data);
      const cfg = await getTrustedRolloutConfig();
      setConfig(cfg);
      setSubsText(cfg.substitutionsEnabledFor.join(','));
      setRerouteText(cfg.rerouteEnabledFor.join(','));
      setConfigLoading(false);
      await loadOpsData();
      await loadOpsAlerts();
      const playbook = await getOpsPlaybook();
      setOpsPlaybook(playbook);
      setLoading(false);
    };
    load();
  }, []);

  const loadOpsData = async () => {
    setOpsLoading(true);
    const [queue, restPayables, drvPayables] = await Promise.all([
      getPaymentReviewQueue(),
      getRestaurantPayablesPending({
        restaurantId: restFilter.restaurantId || null,
        status: restFilter.status || null,
        payoutRef: restFilter.payoutRef || null,
        createdAfter: restFilter.createdAfter || null,
        createdBefore: restFilter.createdBefore || null,
      }),
      getDriverPayablesPending({
        driverId: driverFilter.driverId || null,
        status: driverFilter.status || null,
        payoutRef: driverFilter.payoutRef || null,
        createdAfter: driverFilter.createdAfter || null,
        createdBefore: driverFilter.createdBefore || null,
      }),
    ]);
    setReviewQueue(queue);
    setRestaurantPayables(restPayables);
    setDriverPayables(drvPayables);
    setOpsLoading(false);
  };

  const loadOpsAlerts = async () => {
    const snapshot = await getOpsAlertsSnapshot();
    setOpsAlerts(snapshot);
  };

  const loadSettlementReport = async () => {
    const days = Number(settlementDays) || 1;
    const report = await getSettlementReport(days);
    setSettlementReport(report);
  };

  const loadAgingPayables = async () => {
    const hours = Number(agingHours) || 24;
    const list = await getAgingPayables(hours);
    setAgingPayables(list);
  };

  const parseList = (val: string) => val.split(',').map(v => v.trim()).filter(Boolean);

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    setStatus(null);
    const ok = await upsertTrustedRolloutConfig({
      ...config,
      substitutionsEnabledFor: parseList(subsText),
      rerouteEnabledFor: parseList(rerouteText),
    });
    setSavingConfig(false);
    setStatus(ok ? 'Rollout config saved.' : 'Failed to save config.');
  };

  const handleApplyKillSwitch = async () => {
    setStatus(null);
    const ok = await runKillSwitch();
    setStatus(ok ? 'Kill switch applied (where thresholds breached).' : 'Failed to apply kill switch.');
  };

  const handleRefreshMetrics = async () => {
    setRefreshingMetrics(true);
    await runPopulateMetrics();
    const data = await getTrustedArrivalMetrics(7);
    setMetrics(data);
    setRefreshingMetrics(false);
    setStatus('Metrics refreshed.');
  };

  const expectedAmount = (o: PaymentReviewItem) =>
    Number((o.subtotal ?? 0) + (o.tax_amount ?? 0) + (o.tip_amount ?? 0) + (o.delivery_fee ?? 0) + (o.platform_fee ?? 0));

  const mismatch = (o: PaymentReviewItem) => {
    const reported = o.total_charged ?? o.total ?? 0;
    return Math.abs(reported - expectedAmount(o)) > 0.01;
  };

  const handleApprove = async (orderId: string) => {
    setOpsStatus(null);
    const ok = await approvePaymentReview(orderId);
    if (ok) {
      setReviewQueue(prev => prev.filter(q => q.id !== orderId));
      setOpsStatus('Payment approved and marked paid.');
    } else {
      setOpsStatus('Failed to approve payment.');
    }
  };

  const handleReject = async (orderId: string) => {
    setOpsStatus(null);
    const ok = await rejectPaymentReview(orderId, 'mismatch');
    if (ok) {
      setReviewQueue(prev => prev.filter(q => q.id !== orderId));
      setOpsStatus('Payment rejected and marked failed.');
    } else {
      setOpsStatus('Failed to reject payment.');
    }
  };

  const badgeStyle = (state: 'pending' | 'review' | 'paid' | 'failed' | 'initiated') => {
    switch (state) {
      case 'paid':
        return { container: styles.badgeSuccess, text: styles.badgeSuccessText };
      case 'review':
        return { container: styles.badgeWarning, text: styles.badgeWarningText };
      case 'failed':
        return { container: styles.badgeError, text: styles.badgeErrorText };
      case 'initiated':
        return { container: styles.badgeInfo, text: styles.badgeInfoText };
      default:
        return { container: styles.badgeNeutral, text: styles.badgeNeutralText };
    }
  };

  const renderBadge = (label: string, state: 'pending' | 'review' | 'paid' | 'failed' | 'initiated') => {
    const cls = badgeStyle(state);
    return (
      <View style={[styles.badge, cls.container]}>
        <Text style={[styles.badgeText, cls.text]}>{label}</Text>
      </View>
    );
  };

  const paymentBadgeState = (status?: string | null): 'pending' | 'review' | 'paid' | 'failed' => {
    if (!status) return 'pending';
    if (status === 'paid_pending_review') return 'review';
    if (status === 'paid' || status === 'captured') return 'paid';
    if (status === 'failed' || status === 'refunded' || status === 'voided') return 'failed';
    return 'pending';
  };

  const payoutBadgeState = (status?: string | null): 'pending' | 'initiated' | 'paid' | 'failed' => {
    if (!status) return 'pending';
    if (status === 'initiated') return 'initiated';
    if (status === 'paid') return 'paid';
    if (status === 'failed') return 'failed';
    return 'pending';
  };

  const money = (val?: number | null) => Number(val ?? 0).toFixed(2);

  const handleSubmitProof = async () => {
    setPaymentProofStatus(null);
    if (!paymentProofForm.orderId || !paymentProofForm.txnId || !paymentProofForm.amount) {
      setPaymentProofStatus('Order, txn, and amount are required.');
      return;
    }
    setBusy(prev => ({ ...prev, proof: true }));
    const amount = Number(paymentProofForm.amount || 0);
    const res = await submitPaymentProofManual({
      orderId: paymentProofForm.orderId.trim(),
      txnId: paymentProofForm.txnId.trim(),
      amount,
      receiptUrl: paymentProofForm.receiptUrl.trim() || undefined,
    });
    if (res.ok) {
      setPaymentProofStatus(
        `Recorded proof: status=${res.result?.status ?? 'unknown'}, auto=${res.result?.auto_verified ? 'yes' : 'no'}`
      );
      setPaymentProofForm({ orderId: '', txnId: '', amount: '', receiptUrl: '' });
      await loadOpsData();
      await loadOpsAlerts();
      await loadSettlementReport();
      await loadAgingPayables();
    } else {
      setPaymentProofStatus(`Failed: ${res.error}`);
    }
    setBusy(prev => ({ ...prev, proof: false }));
  };

  const handleManualPayout = async () => {
    setPayoutStatus(null);
    if (!payoutForm.orderId) {
      setPayoutStatus('Order ID is required.');
      return;
    }
    if (payoutForm.scope === 'driver' && !payoutForm.driverId) {
      setPayoutStatus('Driver ID is required for driver payout.');
      return;
    }
    setBusy(prev => ({ ...prev, payout: true }));
    const common = {
      orderId: payoutForm.orderId.trim(),
      payoutRef: payoutForm.payoutRef.trim() || undefined,
      success: payoutForm.success,
      errorNote: payoutForm.success ? undefined : payoutForm.errorNote.trim() || undefined,
    };
    const res =
      payoutForm.scope === 'restaurant'
        ? await markRestaurantPayoutManual(common)
        : await markDriverPayoutManual({ ...common, driverId: payoutForm.driverId.trim() });

    if (res.ok) {
      setPayoutStatus(`Payout marked ${payoutForm.scope}: ${res.status ?? 'ok'}`);
      setPayoutForm({
        orderId: '',
        scope: payoutForm.scope,
        payoutRef: '',
        driverId: payoutForm.scope === 'driver' ? payoutForm.driverId : '',
        success: true,
        errorNote: '',
      });
      await loadOpsData();
      await loadOpsAlerts();
      await loadSettlementReport();
      await loadAgingPayables();
    } else {
      setPayoutStatus(`Failed: ${res.error}`);
    }
    setBusy(prev => ({ ...prev, payout: false }));
  };

  const handleRetryRestaurantPayout = async (orderId: string, payoutRef?: string) => {
    setOpsStatus(null);
    const res = await retryRestaurantPayout(orderId, payoutRef);
    if (res.ok) {
      setOpsStatus('Restaurant payout retried.');
      await loadOpsData();
      await loadSettlementReport();
      await loadAgingPayables();
    } else {
      setOpsStatus(`Retry failed: ${res.error}`);
    }
  };

  const handleRetryDriverPayout = async (orderId: string, driverId?: string | null, payoutRef?: string) => {
    setOpsStatus(null);
    if (!driverId) {
      setOpsStatus('Driver ID required to retry driver payout.');
      return;
    }
    const res = await retryDriverPayout({ orderId, driverId, payoutRef });
    if (res.ok) {
      setOpsStatus('Driver payout retried.');
      await loadOpsData();
      await loadSettlementReport();
      await loadAgingPayables();
    } else {
      setOpsStatus(`Retry failed: ${res.error}`);
    }
  };

  const handleFetchAdminDetail = async () => {
    setAdminDetailStatus(null);
    if (!adminOrderId) {
      setAdminDetailStatus('Order ID is required.');
      return;
    }
    const detail = await getOrderAdminDetail(adminOrderId.trim());
    if (!detail) {
      setAdminDetailStatus('No detail found or error fetching.');
      setAdminOrderDetail(null);
    } else {
      setAdminOrderDetail(detail);
      setAdminDetailStatus('Loaded order detail.');
    }
  };

  const handleReconcile = async () => {
    setReconStatus(null);
    setReconResults([]);
    if (!reconInput.trim()) {
      setReconStatus('Paste settlement rows JSON to reconcile.');
      return;
    }
    try {
      const parsed = JSON.parse(reconInput);
      if (!Array.isArray(parsed)) {
        setReconStatus('Input must be a JSON array.');
        return;
      }
      const res = await reconcileSettlementImport(parsed);
      if (!res.ok) {
        setReconStatus(`Failed: ${res.error}`);
        return;
      }
      setReconResults(res.result);
      setReconStatus('Reconciled.');
      await loadOpsAlerts();
      await loadSettlementReport();
      await loadAgingPayables();
    } catch (err: any) {
      setReconStatus(`Parse error: ${err?.message ?? 'invalid JSON'}`);
    }
  };

  const handleProcessDuePayouts = async () => {
    setRetryStatus('Processing due retries…');
    const res = await retryDuePayouts();
    const msg = `Retried ${res.restRetried} restaurant and ${res.driverRetried} driver payouts${res.errors.length ? ` • errors: ${res.errors.slice(0,3).join(',')}${res.errors.length>3?'…':''}` : ''}`;
    setRetryStatus(msg);
    await loadOpsData();
    await loadOpsAlerts();
    await loadSettlementReport();
    await loadAgingPayables();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.header}>Trusted Arrival Ops</Text>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rollout flags</Text>
          {configLoading || !config ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text style={styles.row}>Loading config…</Text>
            </View>
          ) : (
            <>
              <View style={styles.switchRow}>
                <Text style={styles.row}>Observe only</Text>
                <Switch
                  value={config.observeOnly}
                  onValueChange={val => setConfig({ ...config, observeOnly: val })}
                />
              </View>
              <Text style={styles.inputLabel}>Substitutions enabled for (comma IDs)</Text>
              <TextInput
                style={styles.input}
                placeholder="city1, city2, restaurant-ids…"
                value={subsText}
                onChangeText={setSubsText}
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Reroute enabled for (comma IDs)</Text>
              <TextInput
                style={styles.input}
                placeholder="city1, city2, restaurant-ids…"
                value={rerouteText}
                onChangeText={setRerouteText}
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Kill switch: on-time % threshold</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(config.killSwitchOnTime ?? '')}
                onChangeText={v => setConfig({ ...config, killSwitchOnTime: Number(v) || undefined })}
              />
              <Text style={styles.inputLabel}>Kill switch: reroute rate cap</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(config.killSwitchRerouteRate ?? '')}
                onChangeText={v => setConfig({ ...config, killSwitchRerouteRate: Number(v) || undefined })}
              />
              <Text style={styles.inputLabel}>Kill switch: credit budget per 100 orders</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(config.killSwitchCreditBudget ?? '')}
                onChangeText={v => setConfig({ ...config, killSwitchCreditBudget: Number(v) || undefined })}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={handleSaveConfig}
                  disabled={savingConfig}
                  style={[styles.button, styles.buttonLeft]}
                >
                  <Text style={styles.buttonText}>{savingConfig ? 'Saving…' : 'Save rollout config'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApplyKillSwitch}
                  style={[styles.button, styles.secondaryButton, styles.buttonRight]}
                >
                  <Text style={styles.secondaryButtonText}>Apply kill switch</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleRefreshMetrics} style={[styles.button, styles.outlineButton]}>
                <Text style={styles.outlineButtonText}>{refreshingMetrics ? 'Refreshing…' : 'Refresh metrics now'}</Text>
              </TouchableOpacity>
              {status && <Text style={styles.status}>{status}</Text>}
            </>
          )}
        </View>

        <Text style={styles.header}>Payments Ops</Text>
        {opsLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#FF6B35" />
          </View>
        ) : (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Record customer payment proof (Instapay screenshot)</Text>
              <Text style={styles.inputLabel}>Order ID</Text>
              <TextInput
                style={styles.input}
                value={paymentProofForm.orderId}
                onChangeText={v => setPaymentProofForm(prev => ({ ...prev, orderId: v }))}
                placeholder="order uuid"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Txn ID</Text>
              <TextInput
                style={styles.input}
                value={paymentProofForm.txnId}
                onChangeText={v => setPaymentProofForm(prev => ({ ...prev, txnId: v }))}
                placeholder="instapay txn reference"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                value={paymentProofForm.amount}
                onChangeText={v => setPaymentProofForm(prev => ({ ...prev, amount: v }))}
                keyboardType="numeric"
                placeholder="123.45"
              />
              <Text style={styles.inputLabel}>Receipt URL (screenshot)</Text>
              <TextInput
                style={styles.input}
                value={paymentProofForm.receiptUrl}
                onChangeText={v => setPaymentProofForm(prev => ({ ...prev, receiptUrl: v }))}
                placeholder="https://…"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={handleSubmitProof} style={[styles.button, styles.outlineButton, { marginTop: 10 }]}>
                <Text style={styles.outlineButtonText}>{busy.proof ? 'Recording…' : 'Record payment proof'}</Text>
              </TouchableOpacity>
              {paymentProofStatus && <Text style={styles.status}>{paymentProofStatus}</Text>}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Manually mark payout (after Instapay transfer)</Text>
              <View style={styles.switchRow}>
                <Text style={styles.row}>Scope: {payoutForm.scope}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setPayoutForm(prev => ({ ...prev, scope: 'restaurant' }))}
                    style={[styles.badge, payoutForm.scope === 'restaurant' ? styles.badgeInfo : styles.badgeNeutral]}
                  >
                    <Text style={[styles.badgeText, payoutForm.scope === 'restaurant' ? styles.badgeInfoText : styles.badgeNeutralText]}>
                      Restaurant
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPayoutForm(prev => ({ ...prev, scope: 'driver' }))}
                    style={[styles.badge, payoutForm.scope === 'driver' ? styles.badgeInfo : styles.badgeNeutral]}
                  >
                    <Text style={[styles.badgeText, payoutForm.scope === 'driver' ? styles.badgeInfoText : styles.badgeNeutralText]}>
                      Driver
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.inputLabel}>Order ID</Text>
              <TextInput
                style={styles.input}
                value={payoutForm.orderId}
                onChangeText={v => setPayoutForm(prev => ({ ...prev, orderId: v }))}
                placeholder="order uuid"
                autoCapitalize="none"
              />
              {payoutForm.scope === 'driver' && (
                <>
                  <Text style={styles.inputLabel}>Driver ID</Text>
                  <TextInput
                    style={styles.input}
                    value={payoutForm.driverId}
                    onChangeText={v => setPayoutForm(prev => ({ ...prev, driverId: v }))}
                    placeholder="driver uuid"
                    autoCapitalize="none"
                  />
                </>
              )}
              <Text style={styles.inputLabel}>Payout reference (Instapay txn)</Text>
              <TextInput
                style={styles.input}
                value={payoutForm.payoutRef}
                onChangeText={v => setPayoutForm(prev => ({ ...prev, payoutRef: v }))}
                placeholder="txn ref"
                autoCapitalize="none"
              />
              <View style={styles.switchRow}>
                <Text style={styles.row}>Success?</Text>
                <Switch
                  value={payoutForm.success}
                  onValueChange={v => setPayoutForm(prev => ({ ...prev, success: v }))}
                />
              </View>
              {!payoutForm.success && (
                <>
                  <Text style={styles.inputLabel}>Error note</Text>
                  <TextInput
                    style={styles.input}
                    value={payoutForm.errorNote}
                    onChangeText={v => setPayoutForm(prev => ({ ...prev, errorNote: v }))}
                    placeholder="reason for failure"
                  />
                </>
              )}
              <TouchableOpacity onPress={handleManualPayout} style={[styles.button, styles.outlineButton, { marginTop: 10 }]}>
                <Text style={styles.outlineButtonText}>{busy.payout ? 'Marking…' : 'Mark payout'}</Text>
              </TouchableOpacity>
              {payoutStatus && <Text style={styles.status}>{payoutStatus}</Text>}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Settlement reconciliation (paste JSON array)</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                value={reconInput}
                onChangeText={setReconInput}
                placeholder='[{"txn_id":"123","payment_ref":"abc","amount":100.00,"settlement_date":"2025-07-01","channel":"instapay"}]'
                multiline
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={handleReconcile} style={[styles.button, styles.outlineButton, { marginTop: 10 }]}>
                <Text style={styles.outlineButtonText}>Reconcile settlements</Text>
              </TouchableOpacity>
              {reconStatus && <Text style={styles.status}>{reconStatus}</Text>}
              {reconResults.length > 0 && (
                <View style={[styles.card, { marginTop: 10 }]}>
                  {reconResults.slice(0, 5).map((r, idx) => (
                    <Text key={`${r.txn_id}-${idx}`} style={styles.row}>
                      {r.txn_id || r.payment_ref}: {r.match_status} ({r.matched_entity || 'none'})
                    </Text>
                  ))}
                  {reconResults.length > 5 && (
                    <Text style={styles.row}>+{reconResults.length - 5} more…</Text>
                  )}
                </View>
              )}
              {reconResults.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    const payload = JSON.stringify(reconResults, null, 2);
                    Clipboard.setStringAsync(payload);
                  }}
                  style={[styles.button, styles.outlineButton, { marginTop: 8 }]}
                >
                  <Text style={styles.outlineButtonText}>Copy results JSON</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Order audit detail</Text>
              <Text style={styles.inputLabel}>Order ID</Text>
              <TextInput
                style={styles.input}
                value={adminOrderId}
                onChangeText={setAdminOrderId}
                placeholder="order uuid"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={handleFetchAdminDetail} style={[styles.button, styles.outlineButton, { marginTop: 10 }]}>
                <Text style={styles.outlineButtonText}>Fetch order detail</Text>
              </TouchableOpacity>
              {adminDetailStatus && <Text style={styles.status}>{adminDetailStatus}</Text>}
              {adminOrderDetail && (
                <View style={[styles.card, { marginTop: 10 }]}>
                  <Text style={styles.title}>Payment: {adminOrderDetail.payment_status}</Text>
                  <Text style={styles.row}>Restaurant payout: {adminOrderDetail.restaurant_payout_status ?? '—'}</Text>
                  <Text style={styles.row}>Driver payout: {adminOrderDetail.driver_payout_status ?? '—'}</Text>
                  <Text style={styles.row}>Platform fee: {adminOrderDetail.ledger?.platform_fee ?? '—'}</Text>
                  <Text style={styles.row}>Restaurant net: {adminOrderDetail.ledger?.restaurant_net ?? '—'}</Text>
                  <Text style={styles.row}>Total charged: {adminOrderDetail.ledger?.total_charged ?? '—'}</Text>
                  <Text style={styles.row}>Txn ID: {adminOrderDetail.customer_payment_txn_id ?? '—'}</Text>
                </View>
              )}
            </View>

            <View style={styles.filtersCard}>
              <Text style={styles.sectionTitle}>Payout filters</Text>
              <Text style={styles.inputLabel}>Restaurant ID</Text>
              <TextInput
                style={styles.input}
                value={restFilter.restaurantId}
                onChangeText={v => setRestFilter(prev => ({ ...prev, restaurantId: v }))}
                placeholder="restaurant uuid"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Restaurant payout status</Text>
              <TextInput
                style={styles.input}
                value={restFilter.status}
                onChangeText={v => setRestFilter(prev => ({ ...prev, status: v }))}
                placeholder="pending/initiated/paid/failed"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Restaurant payout ref</Text>
              <TextInput
                style={styles.input}
                value={restFilter.payoutRef}
                onChangeText={v => setRestFilter(prev => ({ ...prev, payoutRef: v }))}
                placeholder="payout ref"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Created after (ISO)</Text>
              <TextInput
                style={styles.input}
                value={restFilter.createdAfter}
                onChangeText={v => setRestFilter(prev => ({ ...prev, createdAfter: v }))}
                placeholder="2025-07-01T00:00:00Z"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Created before (ISO)</Text>
              <TextInput
                style={styles.input}
                value={restFilter.createdBefore}
                onChangeText={v => setRestFilter(prev => ({ ...prev, createdBefore: v }))}
                placeholder="2025-07-08T00:00:00Z"
                autoCapitalize="none"
              />
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Driver ID</Text>
              <TextInput
                style={styles.input}
                value={driverFilter.driverId}
                onChangeText={v => setDriverFilter(prev => ({ ...prev, driverId: v }))}
                placeholder="driver uuid"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Driver payout status</Text>
              <TextInput
                style={styles.input}
                value={driverFilter.status}
                onChangeText={v => setDriverFilter(prev => ({ ...prev, status: v }))}
                placeholder="pending/initiated/paid/failed"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Driver payout ref</Text>
              <TextInput
                style={styles.input}
                value={driverFilter.payoutRef}
                onChangeText={v => setDriverFilter(prev => ({ ...prev, payoutRef: v }))}
                placeholder="payout ref"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Created after (ISO)</Text>
              <TextInput
                style={styles.input}
                value={driverFilter.createdAfter}
                onChangeText={v => setDriverFilter(prev => ({ ...prev, createdAfter: v }))}
                placeholder="2025-07-01T00:00:00Z"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Created before (ISO)</Text>
              <TextInput
                style={styles.input}
                value={driverFilter.createdBefore}
                onChangeText={v => setDriverFilter(prev => ({ ...prev, createdBefore: v }))}
                placeholder="2025-07-08T00:00:00Z"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={loadOpsData} style={[styles.button, styles.outlineButton, { marginTop: 10 }]}>
                <Text style={styles.outlineButtonText}>Apply filters</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Manual review queue</Text>
              {reviewQueue.length === 0 ? (
                <Text style={styles.row}>No items.</Text>
              ) : (
                reviewQueue.map(item => (
                  <View key={item.id} style={[styles.card, mismatch(item) && styles.warningCard]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.title}>Order {item.id.slice(-6).toUpperCase()}</Text>
                      {renderBadge('Payment review', 'review')}
                    </View>
                    <Text style={styles.row}>Txn: {item.customer_payment_txn_id ?? '—'}</Text>
                    <CopyChip label="Copy txn" value={item.customer_payment_txn_id ?? undefined} />
                    <Text style={styles.row}>Reported: {money(item.total_charged ?? item.total ?? 0)}</Text>
                    <View style={styles.feeGrid}>
                      <View style={styles.feeCell}>
                        <Text style={styles.feeLabel}>Subtotal</Text>
                        <Text style={styles.feeValue}>${money(item.subtotal)}</Text>
                      </View>
                      <View style={styles.feeCell}>
                        <Text style={styles.feeLabel}>Delivery</Text>
                        <Text style={styles.feeValue}>${money(item.delivery_fee)}</Text>
                      </View>
                      <View style={styles.feeCell}>
                        <Text style={styles.feeLabel}>Tax</Text>
                        <Text style={styles.feeValue}>${money(item.tax_amount)}</Text>
                      </View>
                      <View style={styles.feeCell}>
                        <Text style={styles.feeLabel}>Platform fee</Text>
                        <Text style={styles.feeValue}>${money(item.platform_fee)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.row, mismatch(item) && styles.warningText]}>
                      Expected: {expectedAmount(item).toFixed(2)} • Mismatch: {mismatch(item) ? 'Yes' : 'No'}
                    </Text>
                    {mismatch(item) && <Text style={[styles.row, styles.warningText]}>Flagged: amount mismatch or txn duplicate</Text>}
                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={[styles.button, styles.buttonLeft]} onPress={() => handleApprove(item.id)}>
                        <Text style={styles.buttonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.button, styles.secondaryButton, styles.buttonRight]} onPress={() => handleReject(item.id)}>
                        <Text style={styles.secondaryButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Restaurant payables (pending)</Text>
              {restaurantPayables.length === 0 ? (
                <Text style={styles.row}>No pending payouts.</Text>
              ) : (
                restaurantPayables.map(item => (
                  <View key={item.order_id} style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.title}>Order {item.order_id.slice(-6).toUpperCase()}</Text>
                      <View style={styles.badgeRow}>
                        {renderBadge('Payment', paymentBadgeState(item.payment_status))}
                        {renderBadge('Restaurant payout', payoutBadgeState(item.restaurant_payout_status))}
                      </View>
                    </View>
                    <Text style={styles.row}>Restaurant: {item.restaurant_id}</Text>
                    <Text style={styles.row}>Restaurant net: ${money(item.restaurant_net)}</Text>
                    <Text style={styles.row}>Tip: ${money(item.tip_amount)}</Text>
                    <Text style={styles.row}>Attempts: {item.payout_attempts ?? 0}</Text>
                    <Text style={styles.row}>Ref: {item.payout_ref ?? '—'}</Text>
                    <CopyChip label="Copy payout ref" value={item.payout_ref} />
                    <Text style={styles.row}>Next retry at: {item.restaurant_payout_next_retry_at ?? '—'}</Text>
                    {item.restaurant_payout_last_error ? (
                      <Text style={[styles.row, styles.warningText]}>Last error: {item.restaurant_payout_last_error}</Text>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.button, styles.outlineButton, { marginTop: 8 }]}
                      onPress={() => handleRetryRestaurantPayout(item.order_id, item.payout_ref ?? undefined)}
                    >
                      <Text style={styles.outlineButtonText}>Retry payout</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Driver payables (pending)</Text>
              {driverPayables.length === 0 ? (
                <Text style={styles.row}>No pending payouts.</Text>
              ) : (
                driverPayables.map(item => (
                  <View key={item.order_id} style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.title}>Order {item.order_id.slice(-6).toUpperCase()}</Text>
                      <View style={styles.badgeRow}>
                        {renderBadge('Payment', paymentBadgeState(item.payment_status))}
                        {renderBadge('Driver payout', payoutBadgeState(item.driver_payout_status))}
                      </View>
                    </View>
                    <Text style={styles.row}>Driver: {item.driver_id ?? '—'}</Text>
                    <Text style={styles.row}>Handle: {item.driver_payout_handle ?? '—'}</Text>
                    <Text style={styles.row}>Delivery fee: ${money(item.delivery_fee)}</Text>
                    <Text style={styles.row}>Tip: ${money(item.tip_amount)}</Text>
                    <Text style={styles.row}>Attempts: {item.payout_attempts ?? 0}</Text>
                    <Text style={styles.row}>Ref: {item.payout_ref ?? '—'}</Text>
                    <CopyChip label="Copy payout ref" value={item.payout_ref} />
                    <Text style={styles.row}>Next retry at: {item.driver_payout_next_retry_at ?? '—'}</Text>
                    {item.driver_payout_last_error ? (
                      <Text style={[styles.row, styles.warningText]}>Last error: {item.driver_payout_last_error}</Text>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.button, styles.outlineButton, { marginTop: 8 }]}
                      onPress={() => handleRetryDriverPayout(item.order_id, item.driver_id, item.payout_ref ?? undefined)}
                    >
                      <Text style={styles.outlineButtonText}>Retry payout</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
            {opsStatus && <Text style={styles.status}>{opsStatus}</Text>}
            <TouchableOpacity onPress={handleProcessDuePayouts} style={[styles.button, styles.outlineButton, { marginTop: 10 }]}>
              <Text style={styles.outlineButtonText}>Process due payout retries</Text>
            </TouchableOpacity>
            {retryStatus && <Text style={styles.status}>{retryStatus}</Text>}
          </>
        )}

        <Text style={styles.header}>Trusted Arrival Metrics (7d)</Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : (
          metrics.map((m, idx) => (
            <View key={`${m.restaurant_id}-${m.metric_date}-${idx}`} style={styles.card}>
              <Text style={styles.title}>Restaurant {m.restaurant_id}</Text>
              <Text style={styles.subtitle}>{m.metric_date}</Text>
              <Text style={styles.row}>On-time %: {m.on_time_pct ?? '—'}</Text>
              <Text style={styles.row}>Reroute rate: {m.reroute_rate ?? '—'}</Text>
              <Text style={styles.row}>Substitution acceptance: {m.substitution_acceptance ?? '—'}</Text>
              <Text style={styles.row}>Credit cost: {m.credit_cost ?? 0}</Text>
              <Text style={styles.row}>Affected orders: {m.affected_orders ?? 0}</Text>
              {m.csat_affected !== null && m.csat_affected !== undefined ? (
                <Text style={styles.row}>CSAT affected: {m.csat_affected}</Text>
              ) : (
                <Text style={styles.row}>CSAT data not available</Text>
              )}
            </View>
          ))
        )}

        <Text style={styles.header}>Ops Alerts Snapshot</Text>
        {opsAlerts ? (
          <View style={styles.card}>
            <Text style={styles.row}>
              Pending beyond SLA — Restaurant: {opsAlerts.pending_beyond_sla.restaurant} | Driver: {opsAlerts.pending_beyond_sla.driver} ({'>'}{opsAlerts.pending_beyond_sla.threshold_hours}h)
            </Text>
            <Text style={styles.row}>
              Payout failure rate — Restaurant: {Number(opsAlerts.payout_failure_rate.restaurant ?? 0).toFixed(3)} | Driver: {Number(opsAlerts.payout_failure_rate.driver ?? 0).toFixed(3)} (cap {opsAlerts.payout_failure_rate.cap})
            </Text>
            <Text style={styles.row}>Payment review backlog: {opsAlerts.payment_review_backlog}</Text>
            <Text style={styles.row}>Payment proof rate limited (24h): {opsAlerts.payment_proof_rate_limited_24h}</Text>
            <Text style={styles.row}>Reconciliation unmatched (48h): {opsAlerts.reconciliation_unmatched_48h}</Text>
          </View>
        ) : (
          <Text style={styles.row}>No snapshot available.</Text>
        )}

        <Text style={styles.header}>Settlement report</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Days</Text>
          <TextInput
            style={styles.input}
            value={settlementDays}
            onChangeText={setSettlementDays}
            keyboardType="numeric"
            placeholder="1"
          />
          <TouchableOpacity onPress={loadSettlementReport} style={[styles.button, styles.outlineButton, { marginTop: 8 }]}>
            <Text style={styles.outlineButtonText}>Refresh settlement</Text>
          </TouchableOpacity>
          {settlementReport && (
            <TouchableOpacity
              onPress={() => {
                const payload = JSON.stringify(settlementReport, null, 2);
                Clipboard.setStringAsync(payload);
              }}
              style={[styles.button, styles.outlineButton, { marginTop: 8 }]}
            >
              <Text style={styles.outlineButtonText}>Copy settlement JSON</Text>
            </TouchableOpacity>
          )}
          {settlementReport ? (
            <>
              <Text style={styles.row}>Platform fee collected: {settlementReport.platform_fee_collected ?? 0}</Text>
              <Text style={styles.row}>Delivery fee pass-through: {settlementReport.delivery_fee_pass_through ?? 0}</Text>
              <Text style={styles.row}>Tip pass-through: {settlementReport.tip_pass_through ?? 0}</Text>
              <Text style={styles.row}>Gross collected: {settlementReport.gross_collected ?? 0}</Text>
              <Text style={styles.row}>Refunds/Void: {settlementReport.refunds_voids ?? 0}</Text>
              <Text style={styles.row}>Net collected: {settlementReport.net_collected ?? 0}</Text>
              <Text style={styles.row}>Restaurant payable due: {settlementReport.restaurant_payable_due ?? 0}</Text>
              <Text style={styles.row}>Driver payable due: {settlementReport.driver_payable_due ?? 0}</Text>
            </>
          ) : (
            <Text style={styles.row}>No settlement data loaded.</Text>
          )}
        </View>

        <Text style={styles.header}>Aging payables</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Older than (hours)</Text>
          <TextInput
            style={styles.input}
            value={agingHours}
            onChangeText={setAgingHours}
            keyboardType="numeric"
            placeholder="24"
          />
          <TouchableOpacity onPress={loadAgingPayables} style={[styles.button, styles.outlineButton, { marginTop: 8 }]}>
            <Text style={styles.outlineButtonText}>Refresh aging</Text>
          </TouchableOpacity>
          {agingPayables.length === 0 ? (
            <Text style={styles.row}>No aging payables.</Text>
          ) : (
            agingPayables.slice(0, 10).map(p => (
              <Text key={`${p.order_id}-${p.payable_type}`} style={styles.row}>
                {p.payable_type} • Order {p.order_id.slice(-6).toUpperCase()} • {p.status} • Attempts {p.attempts} • Age {p.age_hours.toFixed(1)}h {p.last_error ? `• ${p.last_error}` : ''}
              </Text>
            ))
          )}
        </View>

        <Text style={styles.header}>Payout failure playbook</Text>
        {opsPlaybook?.payout_failures?.steps ? (
          <View style={styles.card}>
            {opsPlaybook.payout_failures.steps.map((step, idx) => (
              <Text key={`pf-${idx}`} style={styles.row}>
                • {step}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.row}>No playbook available.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  header: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#111827', marginBottom: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  title: { fontFamily: 'Inter-SemiBold', color: '#111827' },
  subtitle: { fontFamily: 'Inter-Regular', color: '#6B7280', marginBottom: 6 },
  row: { fontFamily: 'Inter-Regular', color: '#111827', fontSize: 13, marginBottom: 2 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  sectionTitle: { fontFamily: 'Inter-SemiBold', color: '#111827', fontSize: 15, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  inputLabel: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginTop: 4,
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  button: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  secondaryButton: { backgroundColor: '#FFEDD5' },
  secondaryButtonText: { color: '#C2410C', fontFamily: 'Inter-SemiBold' },
  buttonLeft: { marginRight: 6 },
  buttonRight: { marginLeft: 6 },
  outlineButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#111827',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineButtonText: { color: '#111827', fontFamily: 'Inter-SemiBold' },
  status: { marginTop: 8, color: '#16A34A', fontFamily: 'Inter-Regular', fontSize: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  warningCard: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  warningText: { color: '#C2410C' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  badgeNeutral: { backgroundColor: '#F3F4F6' },
  badgeNeutralText: { color: '#374151' },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeWarningText: { color: '#92400E' },
  badgeSuccess: { backgroundColor: '#DCFCE7' },
  badgeSuccessText: { color: '#166534' },
  badgeError: { backgroundColor: '#FEE2E2' },
  badgeErrorText: { color: '#B91C1C' },
  badgeInfo: { backgroundColor: '#DBEAFE' },
  badgeInfoText: { color: '#1D4ED8' },
  feeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  feeCell: { padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8, minWidth: '45%' },
  feeLabel: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter-Regular' },
  feeValue: { fontSize: 14, color: '#111827', fontFamily: 'Inter-SemiBold' },
  filtersCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
});
