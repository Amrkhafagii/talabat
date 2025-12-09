import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { styles } from '@/styles/adminMetrics';
import type { OrderAdminDetail } from '@/utils/db/admin';
import { getOrderAdminDetail, markDriverPayoutManual, markRestaurantPayoutManual, reconcileSettlementImport, submitPaymentProofManual } from '@/utils/database';

export type ManualToolsProps = {
  refreshOpsData: () => Promise<void>;
  refreshReports: () => Promise<void>;
};

export default function ManualTools({ refreshOpsData, refreshReports }: ManualToolsProps) {
  const [paymentProofForm, setPaymentProofForm] = useState({ orderId: '', txnId: '', amount: '', receiptUrl: '' });
  const [paymentProofStatus, setPaymentProofStatus] = useState<string | null>(null);
  const [busyProof, setBusyProof] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    orderId: '',
    scope: 'restaurant' as 'restaurant' | 'driver',
    payoutRef: '',
    driverId: '',
    success: true,
    errorNote: '',
  });
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);
  const [busyPayout, setBusyPayout] = useState(false);
  const [reconInput, setReconInput] = useState('');
  const [reconStatus, setReconStatus] = useState<string | null>(null);
  const [reconResults, setReconResults] = useState<any[]>([]);
  const [adminOrderId, setAdminOrderId] = useState('');
  const [adminOrderDetail, setAdminOrderDetail] = useState<OrderAdminDetail | null>(null);
  const [adminDetailStatus, setAdminDetailStatus] = useState<string | null>(null);

  const handleChangeProof = (field: keyof typeof paymentProofForm, v: string) => {
    setPaymentProofForm(prev => ({ ...prev, [field]: v }));
  };

  const handleSubmitProof = async () => {
    setPaymentProofStatus(null);
    if (!paymentProofForm.orderId || !paymentProofForm.txnId || !paymentProofForm.amount) {
      setPaymentProofStatus('Order, txn, and amount are required.');
      return;
    }
    setBusyProof(true);
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
      await refreshOpsData();
      await refreshReports();
    } else {
      setPaymentProofStatus(`Failed: ${res.error}`);
    }
    setBusyProof(false);
  };

  const handleChangePayout = (changes: Partial<typeof payoutForm>) => {
    setPayoutForm(prev => ({ ...prev, ...changes }));
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
    setBusyPayout(true);
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
      await refreshOpsData();
      await refreshReports();
    } else {
      setPayoutStatus(`Failed: ${res.error}`);
    }
    setBusyPayout(false);
  };

  const handleReconInput = (val: string) => setReconInput(val);

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
      await refreshReports();
    } catch (err: any) {
      setReconStatus(`Parse error: ${err?.message ?? 'invalid JSON'}`);
    }
  };

  const handleCopyRecon = () => {
    const payload = JSON.stringify(reconResults, null, 2);
    Clipboard.setStringAsync(payload);
  };

  const handleChangeAdminOrderId = (val: string) => setAdminOrderId(val);

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

  return (
    <>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Record customer payment proof (Instapay screenshot)</Text>
        <Text style={styles.inputLabel}>Order ID</Text>
        <TextInput
          style={styles.input}
          value={paymentProofForm.orderId}
          onChangeText={v => handleChangeProof('orderId', v)}
          placeholder="order uuid"
          autoCapitalize="none"
        />
        <Text style={styles.inputLabel}>Txn ID</Text>
        <TextInput
          style={styles.input}
          value={paymentProofForm.txnId}
          onChangeText={v => handleChangeProof('txnId', v)}
          placeholder="instapay txn reference"
          autoCapitalize="none"
        />
        <Text style={styles.inputLabel}>Amount</Text>
        <TextInput
          style={styles.input}
          value={paymentProofForm.amount}
          onChangeText={v => handleChangeProof('amount', v)}
          keyboardType="numeric"
          placeholder="123.45"
        />
        <Text style={styles.inputLabel}>Receipt URL (screenshot)</Text>
        <TextInput
          style={styles.input}
          value={paymentProofForm.receiptUrl}
          onChangeText={v => handleChangeProof('receiptUrl', v)}
          placeholder="https://…"
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={handleSubmitProof} style={[styles.button, styles.outlineButton, { marginTop: 10 }]}>
          <Text style={styles.outlineButtonText}>{busyProof ? 'Recording…' : 'Record payment proof'}</Text>
        </TouchableOpacity>
        {paymentProofStatus && <Text style={styles.status}>{paymentProofStatus}</Text>}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Manually mark payout (after Instapay transfer)</Text>
        <View style={styles.switchRow}>
          <Text style={styles.row}>Scope: {payoutForm.scope}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => handleChangePayout({ scope: 'restaurant' })}
              style={[styles.badge, payoutForm.scope === 'restaurant' ? styles.badgeInfo : styles.badgeNeutral]}
            >
              <Text style={[styles.badgeText, payoutForm.scope === 'restaurant' ? styles.badgeInfoText : styles.badgeNeutralText]}>
                Restaurant
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleChangePayout({ scope: 'driver' })}
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
          onChangeText={v => handleChangePayout({ orderId: v })}
          placeholder="order uuid"
          autoCapitalize="none"
        />
        {payoutForm.scope === 'driver' && (
          <>
            <Text style={styles.inputLabel}>Driver ID</Text>
            <TextInput
              style={styles.input}
              value={payoutForm.driverId}
              onChangeText={v => handleChangePayout({ driverId: v })}
              placeholder="driver uuid"
              autoCapitalize="none"
            />
          </>
        )}
        <Text style={styles.inputLabel}>Payout reference (Instapay txn)</Text>
        <TextInput
          style={styles.input}
          value={payoutForm.payoutRef}
          onChangeText={v => handleChangePayout({ payoutRef: v })}
          placeholder="txn ref"
          autoCapitalize="none"
        />
        <View style={styles.switchRow}>
          <Text style={styles.row}>Success?</Text>
          <Switch
            value={payoutForm.success}
            onValueChange={v => handleChangePayout({ success: v })}
          />
        </View>
        {!payoutForm.success && (
          <>
            <Text style={styles.inputLabel}>Error note</Text>
            <TextInput
              style={styles.input}
              value={payoutForm.errorNote}
              onChangeText={v => handleChangePayout({ errorNote: v })}
              placeholder="reason for failure"
            />
          </>
        )}
        <TouchableOpacity onPress={handleManualPayout} style={[styles.button, styles.outlineButton, { marginTop: 10 }]}>
          <Text style={styles.outlineButtonText}>{busyPayout ? 'Marking…' : 'Mark payout'}</Text>
        </TouchableOpacity>
        {payoutStatus && <Text style={styles.status}>{payoutStatus}</Text>}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Settlement reconciliation (paste JSON array)</Text>
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          value={reconInput}
          onChangeText={handleReconInput}
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
            onPress={handleCopyRecon}
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
          onChangeText={handleChangeAdminOrderId}
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
    </>
  );
}
