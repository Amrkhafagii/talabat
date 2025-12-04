import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, MapPin, ChevronDown, ShieldCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { getMenuItemsByIds, createOrder, getUserAddresses, getRestaurantById, getSubstitutionForItem, getAutoApplySubstitution } from '@/utils/database';
import { MenuItem, UserAddress } from '@/types/database';
import CartItemCard from '@/components/customer/CartItemCard';
import { computeEtaBand } from '@/utils/db/trustedArrival';
import { estimateTravelMinutes } from '@/utils/etaService';

export default function Cart() {
  const { cart, updateQuantity, clearCart, getTotalItems } = useCart();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<(MenuItem & { quantity: number })[]>([]);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [etaLabel, setEtaLabel] = useState<string | null>(null);
  const [etaTrusted, setEtaTrusted] = useState<boolean>(false);
  const [substitutionPrompts, setSubstitutionPrompts] = useState<
    { item: MenuItem & { quantity: number }; substitute: MenuItem; maxDeltaPct?: number }[]
  >([]);
  const [substitutionDecisions, setSubstitutionDecisions] = useState<
    { original_item_id: string; substitute_item_id?: string; decision: 'accept' | 'decline' | 'chat'; price_delta?: number; quantity?: number }[]
  >([]);

  useEffect(() => {
    loadCartData();
  }, [cart, user]);

  const loadCartData = async () => {
    try {
      setLoading(true);
      
      // Load cart items in a single batch
      const cartEntries = Object.entries(cart).filter(([, quantity]) => quantity > 0);
      const itemIds = cartEntries.map(([itemId]) => itemId);

      if (itemIds.length > 0) {
        const fetchedItems = await getMenuItemsByIds(itemIds);
        const itemMap = new Map(fetchedItems.map(item => [item.id, item]));

        const itemsWithQuantity = cartEntries
          .map(([itemId, quantity]) => {
            const menuItem = itemMap.get(itemId);
            return menuItem ? { ...menuItem, quantity } : null;
          })
          .filter(Boolean) as (MenuItem & { quantity: number })[];

        setCartItems(itemsWithQuantity);

        const restaurantId = itemsWithQuantity[0]?.restaurant_id;
        if (restaurantId) {
          const restaurant = await getRestaurantById(restaurantId);
          const parsedDelivery = restaurant?.delivery_time ? parseInt(restaurant.delivery_time, 10) : NaN;
          if (!restaurant) return;
          const travelMinutes = estimateTravelMinutes(
            restaurant,
            selectedAddress?.latitude && selectedAddress?.longitude ? selectedAddress : undefined,
            {
              weather: (process.env.EXPO_PUBLIC_WEATHER_SEVERITY as any) || 'normal',
              traffic: 'moderate',
            }
          );
          const prepP50 = !Number.isNaN(parsedDelivery) ? Math.max(10, Math.round(parsedDelivery * 0.4)) : 12;
          const prepP90 = !Number.isNaN(parsedDelivery) ? Math.max(prepP50 + 6, Math.round(parsedDelivery * 0.65)) : 20;
          const eta = computeEtaBand({
            prepP50Minutes: prepP50,
            prepP90Minutes: prepP90,
            bufferMinutes: 4,
            travelMinutes,
            reliabilityScore: restaurant?.rating ? Math.min(restaurant.rating / 5, 1) : 0.9,
            dataFresh: Boolean(restaurant?.updated_at),
          });
          const tooWideOrStale = eta.bandTooWide || eta.dataStale;
          if (tooWideOrStale) {
            setEtaLabel(restaurant?.delivery_time ? `${restaurant.delivery_time} min` : null);
            setEtaTrusted(false);
          } else {
            setEtaLabel(`${eta.etaLowMinutes}-${eta.etaHighMinutes} min`);
            setEtaTrusted(eta.trusted);
          }
        }

        // Build substitution prompts for unavailable items
        const prompts: { item: MenuItem & { quantity: number }; substitute: MenuItem; maxDeltaPct?: number }[] = [];
        for (const item of itemsWithQuantity) {
          if (item.is_available === false) {
            const auto = await getAutoApplySubstitution(item.id);
            if (auto) {
              const priceDeltaPct = item.price > 0 ? ((auto.substitute.price - item.price) / item.price) * 100 : 0;
              const allowedDelta = auto.rule.max_delta_pct ?? 15;
              if (priceDeltaPct <= allowedDelta) {
                applySubstitutionChoice(item, auto.substitute, true);
              } else {
                prompts.push({ item, substitute: auto.substitute, maxDeltaPct: auto.rule.max_delta_pct ?? undefined });
              }
            } else {
              const prompt = await getSubstitutionForItem(item.id);
              if (prompt) {
                const priceDeltaPct = item.price > 0 ? ((prompt.substitute.price - item.price) / item.price) * 100 : 0;
                const allowedDelta = prompt.rule.max_delta_pct ?? 15;
                if (priceDeltaPct <= allowedDelta) {
                  prompts.push({ item, substitute: prompt.substitute, maxDeltaPct: prompt.rule.max_delta_pct ?? undefined });
                }
              }
            }
          }
        }
        setSubstitutionPrompts(prompts);
      } else {
        setCartItems([]);
        setEtaLabel(null);
        setEtaTrusted(false);
        setSubstitutionPrompts([]);
      }

      // Load user addresses if user is logged in
      if (user) {
        const userAddresses = await getUserAddresses(user.id);
        setAddresses(userAddresses);
        
        // Set default address or first address
        const defaultAddress = userAddresses.find(addr => addr.is_default) || userAddresses[0];
        setSelectedAddress(defaultAddress || null);
      }
    } catch (error) {
      console.error('Error loading cart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const ReceiptSection = () => (
    <View style={styles.section}>
      <View style={styles.receiptHeader}>
        <Text style={styles.sectionTitle}>Payment Receipt</Text>
        {receiptUri ? (
          <Text style={styles.receiptStatus}>Attached</Text>
        ) : (
          <Text style={styles.receiptStatusPending}>Required</Text>
        )}
      </View>
      {receiptError ? <Text style={styles.receiptError}>{receiptError}</Text> : null}
      <TouchableOpacity
        style={styles.receiptButton}
        onPress={pickReceipt}
        disabled={receiptUploading}
      >
        <Text style={styles.receiptButtonText}>
          {receiptUploading ? 'Uploading...' : receiptUri ? 'Replace Receipt' : 'Upload Receipt'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.receiptHelper}>
        Upload your payment receipt. Restaurant will start preparing after verification.
      </Text>
    </View>
  );

  const updateItemQuantity = (itemId: string, change: number) => {
    const currentQuantity = cart[itemId] || 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    updateQuantity(itemId, newQuantity);
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const deliveryFee = 2.99;
  const tax = getSubtotal() * 0.08;
  const platformFee = getSubtotal() * 0.10;
  const total = getSubtotal() + deliveryFee + tax + platformFee;

  const handleSelectAddress = () => {
    if (addresses.length === 0) {
      Alert.alert(
        'No Addresses',
        'You need to add a delivery address first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Address', onPress: () => router.push('/customer/add-address' as any) }
        ]
      );
    } else {
      // Show address selection modal or navigate to address selection screen
      router.push('/customer/select-address' as any);
    }
  };

  const pickReceipt = async () => {
    try {
      setReceiptError(null);
      setReceiptUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        setReceiptUploading(false);
        return;
      }

      const file = result.assets[0];
      setReceiptUri(file.uri);
    } catch (err) {
      console.error('Receipt pick error:', err);
      setReceiptError('Failed to pick receipt. Please try again.');
    } finally {
      setReceiptUploading(false);
    }
  };

  const applySubstitutionChoice = (item: MenuItem & { quantity: number }, substitute: MenuItem | null, auto = false, decision: 'accept' | 'decline' | 'chat' = 'accept') => {
    if (substitute) {
      // Add substitute quantity and remove original
      const currentSubQty = cart[substitute.id] || 0;
      updateQuantity(substitute.id, currentSubQty + item.quantity);
      updateQuantity(item.id, 0);
      setCartItems(prev => {
        const others = prev.filter(p => p.id !== item.id);
        const existingSub = others.find(p => p.id === substitute.id);
        if (existingSub) {
          existingSub.quantity += item.quantity;
          return [...others];
        }
        return [...others, { ...substitute, quantity: item.quantity }];
      });
      setSubstitutionDecisions(prev => {
        const filtered = prev.filter(d => d.original_item_id !== item.id);
        return [
          ...filtered,
          {
            original_item_id: item.id,
            substitute_item_id: substitute.id,
            decision,
            price_delta: (substitute.price - item.price) * item.quantity,
            quantity: item.quantity,
          },
        ];
      });
    } else {
      // Decline/refund path
      updateQuantity(item.id, 0);
      setCartItems(prev => prev.filter(p => p.id !== item.id));
      setSubstitutionDecisions(prev => {
        const filtered = prev.filter(d => d.original_item_id !== item.id);
        return [
          ...filtered,
          {
            original_item_id: item.id,
            decision,
            price_delta: -item.price * item.quantity,
            quantity: item.quantity,
          },
        ];
      });
    }

    if (!auto) {
      setSubstitutionPrompts(prev => prev.filter(p => p.item.id !== item.id));
    }
  };

  const handleDeclineSubstitution = (item: MenuItem & { quantity: number }) => {
    applySubstitutionChoice(item, null, false, 'decline');
  };

  const handleChat = () => {
    Alert.alert('Chat', 'Connecting you to support to review substitutions.');
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to place an order');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    // Get restaurant ID from the first item (assuming all items are from the same restaurant)
    const restaurantId = cartItems[0].restaurant_id;
    const deliveryAddressString = `${selectedAddress.address_line_1}${selectedAddress.address_line_2 ? `, ${selectedAddress.address_line_2}` : ''}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code}`;

    setPlacing(true);

    try {
      const orderItems = cartItems.map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
        specialInstructions: undefined
      }));

      const { data: order, error } = await createOrder(
        user.id,
        restaurantId,
        selectedAddress.id,
        deliveryAddressString,
        orderItems,
        getSubtotal(),
        deliveryFee,
        tax,
        0, // tip amount
        total,
        selectedPayment,
        selectedAddress.delivery_instructions,
        receiptUri || undefined,
        {
          substitutions: substitutionDecisions,
        }
      );

      if (error || !order) {
        console.error('Error placing order:', error);
        Alert.alert('Error', 'Failed to place order. Please try again.');
      } else {
        clearCart();
        Alert.alert(
          'Order Placed!',
          'Your order has been placed successfully. You can track it in the Orders section.',
          [
            {
              text: 'View Orders',
            onPress: () => router.push('/customer/orders' as any)
            },
            {
              text: 'Continue Shopping',
              onPress: () => router.push('/(tabs)/customer' as any)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={styles.placeholder} />
        </View>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          {selectedAddress ? (
            <TouchableOpacity style={styles.addressCard} onPress={handleSelectAddress}>
              <MapPin size={20} color="#FF6B35" />
              <View style={styles.addressInfo}>
                <Text style={styles.addressType}>{selectedAddress.label}</Text>
                <Text style={styles.addressText}>
                  {selectedAddress.address_line_1}
                  {selectedAddress.address_line_2 && `, ${selectedAddress.address_line_2}`}
                </Text>
                <Text style={styles.addressText}>
                  {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}
                </Text>
              </View>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addAddressCard} onPress={handleSelectAddress}>
              <MapPin size={20} color="#6B7280" />
              <Text style={styles.addAddressText}>Add delivery address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cart Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {substitutionPrompts.map(prompt => (
            <View key={`sub-${prompt.item.id}`} style={styles.substitutionCard}>
              <Text style={styles.substitutionTitle}>Item unavailable</Text>
              <Text style={styles.substitutionText}>
                {prompt.item.name} is unavailable. We suggest {prompt.substitute.name} for ${prompt.substitute.price.toFixed(2)}.
              </Text>
              <View style={styles.subButtons}>
                <TouchableOpacity style={[styles.subButton, styles.subAccept]} onPress={() => applySubstitutionChoice(prompt.item, prompt.substitute)}>
                  <Text style={styles.subAcceptText}>Accept swap</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.subButton, styles.subDecline]} onPress={() => handleDeclineSubstitution(prompt.item)}>
                  <Text style={styles.subDeclineText}>Decline/refund</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subButton, styles.subChat]}
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
                  <Text style={styles.subChatText}>Chat</Text>
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
            <TouchableOpacity 
              style={[styles.paymentOption, selectedPayment === 'card' && styles.selectedPayment]}
              onPress={() => setSelectedPayment('card')}
            >
              <CreditCard size={20} color="#FF6B35" />
              <Text style={styles.paymentText}>Credit Card</Text>
              <Text style={styles.paymentDetail}>**** 1234</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Receipt Upload */}
        <ReceiptSection />

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <Text style={styles.sectionHint}>You pay once; includes platform service fee and delivery.</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${getSubtotal().toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform fee (10%)</Text>
              <Text style={styles.summaryValue}>${platformFee.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
            {etaLabel && (
              <View style={[styles.etaBadge, etaTrusted ? styles.etaTrusted : styles.etaCaution]}>
                <ShieldCheck size={14} color={etaTrusted ? '#065F46' : '#92400E'} />
                <Text style={[styles.etaText, etaTrusted ? styles.etaTrustedText : styles.etaCautionText]}>
                  {etaTrusted ? 'Trusted arrival' : 'Arrival estimate'} • {etaLabel}
                </Text>
              </View>
            )}
          </View>
        </View>
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
          <Text style={styles.orderTotal}>${total.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addressType: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginTop: 2,
    lineHeight: 18,
  },
  addAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addAddressText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  itemsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  paymentOptions: {
    gap: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedPayment: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF7F5',
  },
  paymentText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  paymentDetail: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  receiptSection: {
    marginBottom: 16,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptStatus: {
    color: '#10B981',
    fontFamily: 'Inter-SemiBold',
  },
  receiptStatusPending: {
    color: '#EF4444',
    fontFamily: 'Inter-SemiBold',
  },
  receiptButton: {
    backgroundColor: '#FFF7F5',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
  },
  receiptButtonText: {
    color: '#FF6B35',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  receiptHelper: {
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  receiptError: {
    color: '#EF4444',
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  sectionHint: {
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  summaryValue: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Medium',
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  substitutionCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  substitutionTitle: {
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    fontSize: 14,
  },
  substitutionText: {
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    fontSize: 13,
  },
  subButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  subButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  subAccept: {
    backgroundColor: '#065F46',
  },
  subAcceptText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  subDecline: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  subDeclineText: {
    color: '#92400E',
    fontFamily: 'Inter-SemiBold',
  },
  subChat: {
    backgroundColor: '#E5E7EB',
  },
  subChatText: {
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  etaTrusted: {
    backgroundColor: '#ECFDF3',
    borderColor: '#D1FAE5',
  },
  etaCaution: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  etaText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  etaTrustedText: {
    color: '#065F46',
  },
  etaCautionText: {
    color: '#92400E',
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  placeOrderText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  orderTotal: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
