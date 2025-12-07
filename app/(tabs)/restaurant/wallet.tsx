import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Wallet as WalletIcon, Shield, Plus, ArrowRightCircle, CreditCard, Trash2, Star, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import ScreenHeader from '@/components/ui/ScreenHeader';
import PillTabs from '@/components/ui/PillTabs';
import Button from '@/components/ui/Button';
import LabeledInput from '@/components/ui/LabeledInput';
import Snackbar from '@/components/ui/Snackbar';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import {
  ensureRestaurantForUser,
  getWalletsByUser,
  getWalletTransactions,
  requestPayout,
  getWalletBalances,
  listPayoutMethods,
  createPayoutMethod,
  setDefaultPayoutMethod,
  deletePayoutMethod,
} from '@/utils/database';
import { Wallet, WalletTransaction, Restaurant, PayoutMethod } from '@/types/database';
import { getKycStatus, upsertKycSubmission, uploadKycDocument } from '@/utils/db/kyc';
import { formatCurrency } from '@/utils/formatters';
import { logMutationError } from '@/utils/telemetry';
import { supabase } from '@/utils/supabase';

const statusColors: Record<string, string> = {
  pending: '#F59E0B',
  completed: '#22C55E',
  failed: '#EF4444',
  on_hold: '#F59E0B',
  processing: '#3B82F6',
  review: '#8B5CF6',
  reversed: '#6B7280',
};

export default function RestaurantWallet() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tabSpacing = theme.device.isSmallScreen ? theme.spacing.md : theme.spacing.lg;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balances, setBalances] = useState<{ available: number; pending: number }>({ available: 0, pending: 0 });
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [kyc, setKyc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [tab, setTab] = useState<'transactions' | 'methods'>('transactions');

  // new method form
  const [methodForm, setMethodForm] = useState({ bankName: '', last4: '', isDefault: false });

  // KYC form
  const [kycStep, setKycStep] = useState(1);
  const [kycForm, setKycForm] = useState({ fullName: '', nationality: '', dob: '', address: '', docUri: '' });
  const [kycSaving, setKycSaving] = useState(false);

  useEffect(() => {
    if (user) loadWallet();
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const rest = await ensureRestaurantForUser(user.id);
      setRestaurant(rest);

      const userWallets = await getWalletsByUser(user.id);
      const restaurantWallet = userWallets.find((w) => w.type === 'restaurant') || userWallets[0] || null;
      setWallet(restaurantWallet || null);
      if (restaurantWallet) {
        const tx = await getWalletTransactions(restaurantWallet.id);
        setTransactions(tx);
        const bal = await getWalletBalances(restaurantWallet.id);
        if (bal) setBalances(bal);
      }

      const methods = await listPayoutMethods(user.id);
      setPayoutMethods(methods);
      setSelectedMethodId(methods.find((m) => m.is_default)?.id ?? methods[0]?.id ?? null);

      if (rest) {
        const k = await getKycStatus(rest.id);
        setKyc(k);
      }
    } catch (err) {
      console.error('load wallet error', err);
      setToast({ msg: 'Failed to load wallet.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  };

  const handleAddMethod = async () => {
    if (!user) return;
    if (!methodForm.bankName.trim() || !methodForm.last4.trim()) {
      setToast({ msg: 'Enter bank name and last4.', type: 'error' });
      return;
    }
    try {
      setSavingMethod(true);
      const method = await createPayoutMethod({
        user_id: user.id,
        type: 'bank_account',
        bank_name: methodForm.bankName.trim(),
        last4: methodForm.last4.trim(),
        is_default: methodForm.isDefault,
        metadata: {},
      } as any);
      if (method) {
        await loadWallet();
        setMethodForm({ bankName: '', last4: '', isDefault: false });
      } else {
        setToast({ msg: 'Failed to add method.', type: 'error' });
      }
    } catch (err) {
      console.error('add method error', err);
      setToast({ msg: 'Failed to add method.', type: 'error' });
    } finally {
      setSavingMethod(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    const ok = await setDefaultPayoutMethod(user.id, id);
    if (ok) {
      await loadWallet();
      setSelectedMethodId(id);
    } else {
      setToast({ msg: 'Failed to set default.', type: 'error' });
    }
  };

  const handleDeleteMethod = async (id: string) => {
    Alert.alert('Remove method', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const ok = await deletePayoutMethod(id);
          if (ok) {
            await loadWallet();
          } else {
            setToast({ msg: 'Failed to remove method.', type: 'error' });
          }
        },
      },
    ]);
  };

  const handleRequestPayout = () => {
    if (!wallet) {
      Alert.alert('No wallet', 'Wallet not found.');
      return;
    }
    if (!selectedMethodId) {
      Alert.alert('Select method', 'Choose a payout method first.');
      return;
    }
    const amount = balances.available;
    if (amount <= 0) {
      Alert.alert('Insufficient balance', 'No available balance to payout.');
      return;
    }
    setRequestingPayout(true);
    const method = payoutMethods.find((m) => m.id === selectedMethodId);
    router.push({
      pathname: '/(tabs)/restaurant/payout-confirm',
      params: {
        walletId: wallet.id,
        amount: amount.toString(),
        methodId: selectedMethodId,
        methodLabel: method ? `${method.bank_name || method.type} ••••${method.last4}` : 'Selected method',
        available: String(balances.available),
        pending: String(balances.pending),
        currency: wallet.currency || 'EGP',
      },
    } as any);
    setRequestingPayout(false);
  };

  const handleSubmitKyc = async () => {
    if (!restaurant) return;
    if (!kycForm.fullName || !kycForm.nationality || !kycForm.dob || !kycForm.address) {
      setToast({ msg: 'Fill all required fields.', type: 'error' });
      return;
    }
    try {
      setKycSaving(true);
      const submissionId = restaurant.id;
      const payload = {
        restaurant_id: restaurant.id,
        submission_id: submissionId,
        full_name: kycForm.fullName,
        nationality: kycForm.nationality,
        dob: kycForm.dob,
        address: kycForm.address,
        status: 'pending',
      };
      const ok = await upsertKycSubmission(payload);
      if (!ok) {
        setToast({ msg: 'Failed to submit KYC.', type: 'error' });
        return;
      }
      if (kycForm.docUri) {
        const uploaded = await uploadKycFile(kycForm.docUri, submissionId);
        if (!uploaded) {
          setToast({ msg: 'Document upload failed.', type: 'error' });
        } else {
          await uploadKycDocument({ submission_id: submissionId, doc_type: 'id', doc_url: uploaded });
        }
      }
      setToast({ msg: 'KYC submitted for review.', type: 'success' });
      const status = await getKycStatus(restaurant.id);
      setKyc(status);
    } catch (err) {
      console.error('kyc submit error', err);
      setToast({ msg: 'KYC submission failed.', type: 'error' });
    } finally {
      setKycSaving(false);
    }
  };

  const uploadKycFile = async (uri: string, ownerId: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const path = `${ownerId}/kyc-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('kyc-docs').upload(path, blob, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from('kyc-docs').getPublicUrl(data.path);
      return publicUrl?.publicUrl || data.path;
    } catch (err) {
      console.error('kyc upload failed', err);
      return null;
    }
  };

  const pickKycDoc = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      setKycForm((prev) => ({ ...prev, docUri: result.assets[0].uri }));
    }
  };

  const kycStatusLabel = kyc?.submission?.status || 'pending';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <ScreenHeader title="Wallet & Payouts" onBack={() => router.back()} />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loaderText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <ScreenHeader title="Wallet & Payouts" onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.accent]} tintColor={theme.colors.accent} />
        }
        contentContainerStyle={{ paddingBottom: theme.insets.bottom + theme.spacing.xl }}
      >
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <WalletIcon size={24} color={theme.colors.accent} />
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>{formatCurrency(balances.available || wallet?.balance || 0)}</Text>
              <Text style={styles.subBalance}>Pending: {formatCurrency(balances.pending || 0)}</Text>
            </View>
          </View>
          <Button title={requestingPayout ? 'Loading...' : 'Request Payout'} onPress={handleRequestPayout} disabled={requestingPayout} />
        </View>

        {kycStatusLabel !== 'approved' && (
          <View style={styles.kycBanner}>
            <Shield size={18} color={theme.colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.kycTitle}>Instapay payments are on hold</Text>
              <Text style={styles.kycText}>Please update your KYC information.</Text>
            </View>
            <TouchableOpacity onPress={() => setKycStep(1)}>
              <ArrowRightCircle size={20} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        )}

        <PillTabs
          tabs={[
            { key: 'transactions', label: 'Transaction History' },
            { key: 'methods', label: 'Payout Methods' },
          ]}
          activeKey={tab}
          onChange={(key) => setTab(key as any)}
          scrollable={false}
          style={{ paddingHorizontal: tabSpacing, marginBottom: theme.spacing.md }}
        />

        {tab === 'transactions' ? (
          <View style={styles.card}>
            {transactions.length === 0 ? (
              <Text style={styles.emptyText}>No transactions yet.</Text>
            ) : (
              transactions.map((tx) => {
                const tone = statusColors[tx.status] || theme.colors.secondaryText;
                return (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={styles.txLeft}>
                      <View style={[styles.txDot, { backgroundColor: tone }]} />
                      <View>
                        <Text style={styles.txType}>{tx.type}</Text>
                        <Text style={styles.txMeta}>{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmount, tx.amount >= 0 ? styles.positive : styles.negative]}>
                        {tx.amount >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(tx.amount))}
                      </Text>
                      <Text style={[styles.txStatus, { color: tone }]}>{tx.status}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.methodsHeader}>
              <Text style={styles.sectionTitle}>Payout Methods</Text>
              <TouchableOpacity style={styles.addMethodButton} onPress={handleAddMethod} disabled={savingMethod}>
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addMethodText}>{savingMethod ? 'Saving...' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Bank name"
              value={methodForm.bankName}
              onChangeText={(v) => setMethodForm((p) => ({ ...p, bankName: v }))}
              placeholderTextColor={theme.colors.formPlaceholder}
            />
            <TextInput
              style={styles.input}
              placeholder="Last 4 digits"
              value={methodForm.last4}
              onChangeText={(v) => setMethodForm((p) => ({ ...p, last4: v }))}
              keyboardType="number-pad"
              maxLength={4}
              placeholderTextColor={theme.colors.formPlaceholder}
            />
            <View style={styles.defaultRow}>
              <Text style={styles.defaultLabel}>Set as default</Text>
              <Switch value={methodForm.isDefault} onValueChange={(v) => setMethodForm((p) => ({ ...p, isDefault: v }))} />
            </View>

            {payoutMethods.length === 0 ? (
              <Text style={styles.emptyText}>No payout methods yet.</Text>
            ) : (
              payoutMethods.map((m) => {
                const active = m.id === selectedMethodId;
                return (
                  <View key={m.id} style={[styles.methodRow, active && styles.methodRowActive]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.methodTitle}>{m.bank_name || m.type}</Text>
                      <Text style={styles.methodMeta}>•••• {m.last4 || '----'}</Text>
                    </View>
                    {m.is_default ? <Star size={16} color={theme.colors.status.success} /> : null}
                    <TouchableOpacity onPress={() => handleSetDefault(m.id)} hitSlop={theme.tap.hitSlop}>
                      <Text style={styles.defaultLink}>Set Default</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteMethod(m.id)} hitSlop={theme.tap.hitSlop}>
                      <Trash2 size={16} color={theme.colors.status.error} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.kycHeader}>
            <Text style={styles.sectionTitle}>KYC Verification</Text>
            <Text style={[styles.kycStatus, { color: kycStatusLabel === 'approved' ? theme.colors.status.success : theme.colors.status.warning }]}>
              {kycStatusLabel}
            </Text>
          </View>
          <View style={styles.stepper}>
            {[1, 2, 3].map((step) => (
              <View key={step} style={styles.step}>
                <View style={[styles.stepDot, step === kycStep && styles.stepDotActive]} />
                <Text style={styles.stepLabel}>Step {step}</Text>
              </View>
            ))}
          </View>

          <LabeledInput label="Full Legal Name" value={kycForm.fullName} onChangeText={(v) => setKycForm((p) => ({ ...p, fullName: v }))} />
          <LabeledInput label="Date of Birth" placeholder="YYYY-MM-DD" value={kycForm.dob} onChangeText={(v) => setKycForm((p) => ({ ...p, dob: v }))} />
          <LabeledInput label="Nationality" value={kycForm.nationality} onChangeText={(v) => setKycForm((p) => ({ ...p, nationality: v }))} />
          <LabeledInput label="Residential Address" value={kycForm.address} onChangeText={(v) => setKycForm((p) => ({ ...p, address: v }))} />

          <View style={styles.docRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.docLabel}>Document Upload</Text>
              {kycForm.docUri ? <Text style={styles.docMeta}>Selected: {kycForm.docUri.split('/').pop()}</Text> : <Text style={styles.docMeta}>Upload ID front/back</Text>}
            </View>
            <TouchableOpacity style={styles.docButton} onPress={pickKycDoc}>
              <FileText size={16} color="#FFFFFF" />
              <Text style={styles.docButtonText}>Upload</Text>
            </TouchableOpacity>
          </View>

          <Button title={kycSaving ? 'Submitting...' : 'Submit KYC'} onPress={handleSubmitKyc} disabled={kycSaving} />
        </View>
      </ScrollView>

      {toast && <Snackbar visible message={toast.msg} type={toast.type} onClose={() => setToast(null)} style={styles.toast} />}
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const isCompact = theme.device.isSmallScreen;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
    loaderText: { ...theme.typography.body, color: theme.colors.secondaryText },
    balanceCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      marginTop: theme.spacing.lg,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      ...theme.shadows.card,
    },
    balanceHeader: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
    balanceLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
    balanceValue: { ...theme.typography.title1 },
    subBalance: { ...theme.typography.caption, color: theme.colors.secondaryText },
    kycBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    kycTitle: { ...theme.typography.subhead },
    kycText: { ...theme.typography.caption, color: theme.colors.secondaryText },
    card: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    txRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderMuted,
    },
    txLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    txDot: { width: 10, height: 10, borderRadius: 5 },
    txType: { ...theme.typography.subhead },
    txMeta: { ...theme.typography.caption, color: theme.colors.secondaryText },
    txAmount: { ...theme.typography.subhead },
    txStatus: { ...theme.typography.caption },
    positive: { color: theme.colors.status.success },
    negative: { color: theme.colors.status.error },
    methodsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
    addMethodButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    addMethodText: { ...theme.typography.buttonSmall, color: '#FFFFFF' },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceAlt,
    },
    defaultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
    defaultLabel: { ...theme.typography.body },
    methodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderMuted,
    },
    methodRowActive: { backgroundColor: theme.colors.surfaceAlt },
    methodTitle: { ...theme.typography.subhead },
    methodMeta: { ...theme.typography.caption, color: theme.colors.secondaryText },
    defaultLink: { ...theme.typography.caption, color: theme.colors.accent },
    emptyText: { ...theme.typography.caption, color: theme.colors.secondaryText },
    kycHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
    sectionTitle: { ...theme.typography.subhead },
    kycStatus: { ...theme.typography.caption, fontFamily: 'Inter-SemiBold' },
    stepper: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
    step: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.border },
    stepDotActive: { backgroundColor: theme.colors.accent },
    stepLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
    docRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.sm },
    docLabel: { ...theme.typography.body },
    docMeta: { ...theme.typography.caption, color: theme.colors.secondaryText },
    docButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.md,
    },
    docButtonText: { ...theme.typography.buttonSmall, color: '#FFFFFF' },
    saveButton: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
    toast: { position: 'absolute', bottom: theme.insets.bottom + theme.spacing.md, left: theme.spacing.lg, right: theme.spacing.lg },
  });
}
