import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { getMenuItemsByIds, createOrder, getUserAddresses, getRestaurantById, getSubstitutionForItem, getAutoApplySubstitution, uploadPaymentProof, submitPaymentProof, getWalletsByUser, getWalletBalances, holdOrderPayment } from '@/utils/database';
import { MenuItem, UserAddress, Restaurant } from '@/types/database';
import { computeEtaBand } from '@/utils/db/trustedArrival';
import { estimateTravelMinutes } from '@/utils/etaService';

type SubstitutionPrompt = { item: MenuItem & { quantity: number }; substitute: MenuItem; maxDeltaPct?: number };
type SubstitutionDecision = { original_item_id: string; substitute_item_id?: string; decision: 'accept' | 'decline' | 'chat'; price_delta?: number; quantity?: number };

const PAYMENT_PROOF_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

export function useCartData() {
  const { cart, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();

  const [cartItems, setCartItems] = useState<(MenuItem & { quantity: number })[]>([]);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('instapay');
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptFileMeta, setReceiptFileMeta] = useState<{ uri: string; mimeType?: string | null; name?: string | null; size?: number | null } | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [etaLabel, setEtaLabel] = useState<string | null>(null);
  const [etaTrusted, setEtaTrusted] = useState<boolean>(false);
  const [substitutionPrompts, setSubstitutionPrompts] = useState<SubstitutionPrompt[]>([]);
  const [substitutionDecisions, setSubstitutionDecisions] = useState<SubstitutionDecision[]>([]);
  const [restaurantMeta, setRestaurantMeta] = useState<Restaurant | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);

  const applySubstitutionChoice = useCallback(
    (item: MenuItem & { quantity: number }, substitute: MenuItem | null, auto = false, decision: 'accept' | 'decline' | 'chat' = 'accept') => {
      if (substitute) {
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
    },
    [cart, updateQuantity]
  );

  const loadWalletBalance = useCallback(async () => {
    if (!user?.id) {
      setWalletBalance(0);
      setWalletId(null);
      return;
    }
    try {
      const wallets = await getWalletsByUser(user.id);
      const customerWallet = wallets.find(w => w.type === 'customer') || wallets[0];
      if (customerWallet) {
        setWalletId(customerWallet.id);
        const balances = await getWalletBalances(customerWallet.id);
        const fallback = Number(customerWallet.balance ?? 0);
        const available = balances?.available ?? fallback;
        setWalletBalance(Number.isFinite(available) ? available : 0);
      } else {
        setWalletId(null);
        setWalletBalance(0);
      }
    } catch (err) {
      console.error('loadWalletBalance error', err);
      setWalletBalance(0);
      setWalletId(null);
    }
  }, [user?.id]);

  useEffect(() => {
    loadWalletBalance();
  }, [loadWalletBalance]);

  useFocusEffect(
    useCallback(() => {
      loadWalletBalance();
    }, [loadWalletBalance])
  );

  const loadCartData = useCallback(async () => {
    try {
      setLoading(true);

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
          setRestaurantMeta(restaurant);
        }

        const prompts: SubstitutionPrompt[] = [];
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

      if (user) {
        const userAddresses = await getUserAddresses(user.id);
        setAddresses(userAddresses);

        const defaultAddress = userAddresses.find(addr => addr.is_default) || userAddresses[0];
        setSelectedAddress(defaultAddress || null);
      }
    } catch (error) {
      console.error('Error loading cart data:', error);
    } finally {
      setLoading(false);
    }
  }, [applySubstitutionChoice, cart, selectedAddress?.latitude, selectedAddress?.longitude, user]);

  useEffect(() => {
    loadCartData();
  }, [cart, user, loadCartData]);

  useFocusEffect(
    useCallback(() => {
      loadCartData();
    }, [loadCartData, user])
  );

  const updateItemQuantity = useCallback(
    (itemId: string, change: number) => {
      const currentQuantity = cart[itemId] || 0;
      const newQuantity = Math.max(0, currentQuantity + change);
      updateQuantity(itemId, newQuantity);
    },
    [cart, updateQuantity]
  );

  const pickReceipt = useCallback(async () => {
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
      const mimeType = (file as any).mimeType as string | undefined;
      const validationError = validateProofFile({
        uri: file.uri,
        mimeType: mimeType ?? null,
        size: (file as any).size ?? null,
      });
      if (validationError) {
        setReceiptError(validationError);
        setReceiptUploading(false);
        return;
      }

      persistReceiptFile({
        uri: file.uri,
        mimeType: mimeType ?? null,
        name: (file as any).name ?? null,
        size: (file as any).size ?? null,
      });
    } catch (err) {
      console.error('Receipt pick error:', err);
      setReceiptError('Failed to pick receipt. Please try again.');
    } finally {
      setReceiptUploading(false);
    }
  }, []);

  const captureReceipt = useCallback(async () => {
    try {
      setReceiptError(null);
      setReceiptUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) {
        setReceiptUploading(false);
        return;
      }

      const asset = result.assets[0];
      const validationError = validateProofFile({
        uri: asset.uri,
        mimeType: asset.type ? `image/${asset.type}` : 'image/jpeg',
        size: asset.fileSize ?? null,
      });
      if (validationError) {
        setReceiptError(validationError);
        setReceiptUploading(false);
        return;
      }

      persistReceiptFile({
        uri: asset.uri,
        mimeType: asset.type ? `image/${asset.type}` : 'image/jpeg',
        name: asset.fileName ?? asset.uri,
        size: asset.fileSize ?? null,
      });
    } catch (err) {
      console.error('Receipt capture error:', err);
      setReceiptError('Failed to capture receipt. Please try again.');
    } finally {
      setReceiptUploading(false);
    }
  }, []);

  const validateProofFile = (file: { uri: string; mimeType?: string | null; size?: number | null }) => {
    if (file.size && file.size > PAYMENT_PROOF_MAX_BYTES) {
      return 'Proof too large. Please upload a file under 5MB.';
    }
    const mimeType = file.mimeType?.toLowerCase?.();
    if (mimeType && !PAYMENT_PROOF_ALLOWED_TYPES.includes(mimeType)) {
      return 'Unsupported file type. Use JPG, PNG, or PDF.';
    }
    return null;
  };

  const persistReceiptFile = (file: { uri: string; mimeType?: string | null; name?: string | null; size?: number | null }) => {
    setReceiptUri(file.uri);
    setReceiptFileMeta({
      uri: file.uri,
      mimeType: file.mimeType ?? null,
      name: file.name ?? null,
      size: file.size ?? null,
    });
  };

  const getSubtotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cartItems]);

  const deliveryFee = 2.99;
  const tax = getSubtotal() * 0.08;
  const platformFee = getSubtotal() * 0.1;
  const total = getSubtotal() + deliveryFee + tax + platformFee;
  const fallbackPayMobile = '01023494000';

  const handlePlaceOrder = useCallback(async () => {
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

    const proofRequired = selectedPayment !== 'wallet';
    if (proofRequired && !receiptUri) {
      Alert.alert('Payment Required', 'Please upload your payment proof before placing the order.');
      return;
    }

    const restaurantId = cartItems[0].restaurant_id;
    const deliveryAddressString = `${selectedAddress.address_line_1}${selectedAddress.address_line_2 ? `, ${selectedAddress.address_line_2}` : ''}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code}`;

    setPlacing(true);

    try {
      const invalidPrice = cartItems.find(item => {
        const priceNum = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        return priceNum === null || priceNum === undefined || Number.isNaN(priceNum) || priceNum <= 0;
      });
      if (invalidPrice) {
        Alert.alert('Error', `Item "${invalidPrice.name}" has an invalid price. Please remove or update it before placing the order.`);
        console.warn('Invalid price detected', { item: invalidPrice });
        setPlacing(false);
        return;
      }

      const invalidQty = cartItems.find(item => !item.quantity || item.quantity <= 0);
      if (invalidQty) {
        Alert.alert('Error', `Item "${invalidQty.name}" has an invalid quantity. Please re-add it to the cart.`);
        console.warn('Invalid quantity detected', { item: invalidQty });
        setPlacing(false);
        return;
      }

      const payMobile = restaurantMeta?.phone || fallbackPayMobile;
      const payoutChannel = (restaurantMeta as any)?.payout_method || (restaurantMeta as any)?.payout_account?.method || 'account';

      const orderItems = cartItems.map(item => {
        const priceNum = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        return {
          menuItemId: item.id,
          quantity: item.quantity > 0 ? item.quantity : 1,
          unitPrice: priceNum ?? 0,
          specialInstructions: undefined,
        };
      });

    let receiptForOrder = receiptUri;
    if (proofRequired && receiptUri && !receiptUri.startsWith('http')) {
      const uploaded = await uploadReceiptToStorage(receiptFileMeta ?? { uri: receiptUri });
      if (!uploaded) {
        Alert.alert('Error', 'Failed to upload receipt. Please try again.');
        setReceiptError('Upload failed—please retry.');
        setPlacing(false);
          return;
        }
        receiptForOrder = uploaded;
        setReceiptUri(uploaded);
        setReceiptFileMeta(prev => (prev ? { ...prev, uri: uploaded } : { uri: uploaded }));
      }

      const { data: order, error } = await createOrder(
        user.id,
        restaurantId,
        selectedAddress.id,
        deliveryAddressString,
        orderItems,
        getSubtotal(),
        deliveryFee,
        tax,
        0,
        total,
        selectedPayment,
        selectedAddress.delivery_instructions,
        receiptForOrder || undefined,
        {
          substitutions: substitutionDecisions,
        }
      );

      if (error || !order) {
        console.error('Error placing order:', error);
        Alert.alert('Error', 'Failed to place order. Please try again.');
      } else {
        if (selectedPayment === 'wallet') {
          const hold = await holdOrderPayment(order.id, 'wallet_checkout');
          if (!hold) {
            Alert.alert('Wallet Hold Failed', 'We could not reserve funds from your wallet. Please try another payment method.');
            setPlacing(false);
            return;
          }
          if (walletBalance !== null) {
            setWalletBalance(Math.max(0, walletBalance - total));
          }
        }
        if (proofRequired) {
          const txnId = `manual-${Date.now()}`;
          const proof = await submitPaymentProof({
            orderId: order.id,
            txnId,
            reportedAmount: total,
            proofUrl: receiptForOrder,
            paidAt: new Date().toISOString(),
          });
          if (!proof.ok) {
            console.error('submit_payment_proof error', proof.error);
            Alert.alert('Warning', 'Order placed, but receipt could not be queued for admin. Please retry from order details.');
          }
        }
        clearCart();
        Alert.alert('Order Placed!', 'Your order has been placed successfully. You can track it in the Orders section.', [
          {
            text: 'View Orders',
            onPress: () => router.push('/customer/orders' as any),
          },
          {
            text: 'Continue Shopping',
            onPress: () => router.push('/(tabs)/customer' as any),
          },
        ]);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }, [cartItems, clearCart, getSubtotal, receiptUri, restaurantMeta, selectedAddress, selectedPayment, substitutionDecisions, tax, total, user]);

  const uploadReceiptToStorage = useCallback(async (file: { uri: string; mimeType?: string | null; name?: string | null; size?: number | null }) => {
    try {
      const uploaded = await uploadPaymentProof(file, user?.id);
      return uploaded?.url ?? null;
    } catch (err) {
      console.error('Receipt upload failed', err);
      return null;
    }
  }, [user?.id]);

  const handleDeclineSubstitution = useCallback(
    (item: MenuItem & { quantity: number }) => {
      applySubstitutionChoice(item, null, false, 'decline');
    },
    [applySubstitutionChoice]
  );

  const handleChat = useCallback(() => {
    Alert.alert('Chat', 'Connecting you to support to review substitutions.');
  }, []);

  const handleSelectAddress = useCallback(() => {
    if (addresses.length === 0) {
      Alert.alert('No Addresses', 'You need to add a delivery address first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Address', onPress: () => router.push('/customer/add-address' as any) },
      ]);
    } else {
      router.push('/customer/select-address' as any);
    }
  }, [addresses.length]);

  return {
    cartItems,
    addresses,
    selectedAddress,
    setSelectedAddress,
    loading,
    placing,
    selectedPayment,
    setSelectedPayment,
    walletBalance,
    receiptUploading,
    receiptUri,
    receiptError,
    etaLabel,
    etaTrusted,
    substitutionPrompts,
    substitutionDecisions,
    setSubstitutionDecisions,
    restaurantMeta,
    deliveryFee,
    tax,
    platformFee,
    total,
    updateItemQuantity,
    pickReceipt,
    captureReceipt,
    handlePlaceOrder,
    handleDeclineSubstitution,
    handleChat,
    applySubstitutionChoice,
    loadCartData,
    getSubtotal,
    handleSelectAddress,
    setReceiptUri,
    setReceiptError,
  };
}
