import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';

import CartItemCard from '@/components/customer/CartItemCard';
import { useCartData } from '@/hooks/useCartData';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { Icon } from '@/components/ui/Icon';
import { CartHeader } from '@/components/customer/CartHeader';
import { CartAddressSection } from '@/components/customer/CartAddressSection';
import { CartReceiptSection } from '@/components/customer/CartReceiptSection';
import { CartSummary } from '@/components/customer/CartSummary';
import { formatCurrency } from '@/utils/formatters';

export default function Cart() {
  const {
    cartItems,
    selectedAddress,
    loading,
    placing,
    selectedPayment,
    setSelectedPayment,
    receiptUploading,
    receiptUri,
    receiptError,
    etaLabel,
    etaTrusted,
    substitutionPrompts,
    deliveryFee,
    tax,
    platformFee,
    total,
    updateItemQuantity,
    pickReceipt,
    handlePlaceOrder,
    handleDeclineSubstitution,
    handleChat,
    applySubstitutionChoice,
    getSubtotal,
    handleSelectAddress,
    setSubstitutionDecisions,
    captureReceipt,
  } = useCartData();
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [fulfillmentMode, setFulfillmentMode] = useState<'delivery' | 'pickup'>('delivery');


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CartHeader onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <CartHeader onBack={() => router.back()} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add some delicious items to get started!</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/(tabs)/customer' as any)}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CartHeader onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Type</Text>
          <View style={styles.toggleRow}>
            {(['delivery', 'pickup'] as const).map((mode) => {
              const active = fulfillmentMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.toggleButton, active && styles.toggleButtonActive]}
                  onPress={() => setFulfillmentMode(mode)}
                >
                  <Icon name={mode === 'delivery' ? 'Truck' : 'Store'} size="md" color={active ? theme.colors.textInverse : theme.colors.text} />
                  <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                    {mode === 'delivery' ? 'Delivery' : 'Pickup'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <CartAddressSection address={selectedAddress} onSelect={handleSelectAddress} />

        {/* Cart Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {substitutionPrompts.map(prompt => (
            <View key={`sub-${prompt.item.id}`} style={styles.substitutionCard}>
              <Text style={styles.substitutionTitle}>Item unavailable</Text>
              <Text style={styles.substitutionText}>
                {prompt.item.name} is unavailable. We suggest {prompt.substitute.name} for {formatCurrency(prompt.substitute.price)}.
              </Text>
              <View style={styles.subButtons}>
                <TouchableOpacity style={[styles.subChip, styles.subChipPrimary]} onPress={() => applySubstitutionChoice(prompt.item, prompt.substitute)}>
                  <Text style={styles.subChipTextPrimary}>Accept swap</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.subChip, styles.subChipSecondary]} onPress={() => handleDeclineSubstitution(prompt.item)}>
                  <Text style={styles.subChipTextSecondary}>Refund item</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subChip, styles.subChipGhost]}
                  onPress={() => {
                    handleChat();
                    setSubstitutionDecisions(prev => {
                      const filtered = prev.filter(d => d.original_item_id !== prompt.item.id || d.decision !== 'chat');
                      return [
                        ...filtered,
                        {
                          original_item_id: prompt.item.id,
                          substitute_item_id: prompt.substitute.id,
                          decision: 'chat',
                        },
                      ];
                    });
                  }}
                >
                  <Text style={styles.subChipTextGhost}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={styles.itemsContainer}>
            {cartItems.map((item) => (
              <CartItemCard
                key={item.id}
                item={{
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity
                }}
                onUpdateQuantity={updateItemQuantity}
              />
            ))}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            {[
              { id: 'instapay', label: 'Instapay', helper: 'Instant confirmation', icon: 'CreditCard' },
              { id: 'wallet', label: 'Wallet', helper: 'Use balance if available', icon: 'Wallet' },
            ].map((method) => {
              const active = method.id === selectedPayment;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.paymentOption, active && styles.selectedPayment]}
                  onPress={async () => {
                    setSelectedPayment(method.id);
                    if (method.id === 'instapay') {
                      await Linking.openURL('https://ipn.eg/S/amrkhafagi/instapay/4VH6jb');
                    }
                  }}
                >
                  <Icon name={method.icon as any} size="md" color={active ? theme.colors.primary[500] : theme.colors.text} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentText}>{method.label}</Text>
                    <Text style={styles.paymentDetail}>{method.helper}</Text>
                  </View>
                  <Icon
                    name={active ? 'CheckCircle' : 'Circle'}
                    size="md"
                    color={active ? theme.colors.primary[500] : theme.colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <CartReceiptSection
          receiptUri={receiptUri}
          receiptError={receiptError}
          uploading={receiptUploading}
          onPick={pickReceipt}
          onCapture={captureReceipt}
        />

        <CartSummary
          subtotal={getSubtotal()}
          deliveryFee={deliveryFee}
          tax={tax}
          platformFee={platformFee}
          total={total}
          etaLabel={etaLabel}
          etaTrusted={etaTrusted}
        />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.placeOrderButton, (placing || !selectedAddress) && styles.disabledButton]} 
          onPress={handlePlaceOrder}
          disabled={placing || !selectedAddress}
        >
          <Text style={styles.placeOrderText}>
            {placing ? 'Placing Order...' : 'Place Order'}
          </Text>
          <Text style={styles.orderTotal}>{formatCurrency(total)}</Text>
        </TouchableOpacity>
      </View>
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
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
      marginBottom: 24,
    },
    shopButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    shopButtonText: {
      color: theme.colors.textInverse,
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 12,
    },
    section: {
      backgroundColor: theme.colors.surface,
      marginBottom: 8,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      gap: 10,
    },
    toggleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    toggleButtonActive: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    },
    toggleText: {
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    toggleTextActive: {
      color: theme.colors.textInverse,
    },
    itemsContainer: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    paymentOptions: {
      gap: 12,
    },
    paymentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedPayment: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[50],
    },
    paymentText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
      marginLeft: 12,
      flex: 1,
    },
    paymentDetail: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    substitutionCard: {
      backgroundColor: theme.colors.statusSoft.warning,
      borderColor: theme.colors.status.warning,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      gap: 6,
    },
    substitutionTitle: {
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.status.warning,
      fontSize: 14,
    },
    substitutionText: {
      fontFamily: 'Inter-Regular',
      color: theme.colors.status.warning,
      fontSize: 13,
    },
    subButtons: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    subChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: theme.radius.pill,
    },
    subChipPrimary: {
      backgroundColor: theme.colors.primary[500],
    },
    subChipSecondary: {
      backgroundColor: theme.colors.statusSoft.warning,
      borderWidth: 1,
      borderColor: theme.colors.status.warning,
    },
    subChipGhost: {
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    subChipTextPrimary: {
      color: theme.colors.textInverse,
      fontFamily: 'Inter-SemiBold',
    },
    subChipTextSecondary: {
      color: theme.colors.status.warning,
      fontFamily: 'Inter-SemiBold',
    },
    subChipTextGhost: {
      color: theme.colors.text,
      fontFamily: 'Inter-SemiBold',
    },
    bottomContainer: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    placeOrderButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: theme.radius.cta,
      ...theme.shadows.raised,
    },
    disabledButton: {
      backgroundColor: theme.colors.borderMuted,
    },
    placeOrderText: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.textInverse,
    },
    orderTotal: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: theme.colors.textInverse,
    },
  });
