import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAddresses } from '@/utils/database';
import { UserAddress } from '@/types/database';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function SelectAddress() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const loadAddresses = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const addressesData = await getUserAddresses(user.id);
      setAddresses(addressesData);
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    const defaultAddress = addresses.find(a => a.is_default);
    if (defaultAddress) {
      setSelectedId(defaultAddress.id);
    }
  }, [addresses]);

  const selectAddress = (address: UserAddress) => {
    // Pass the selected address back to the cart
    router.setParams({
      selectedAddressId: address.id,
      selectedAddressLabel: address.label,
      selectedAddressText: `${address.address_line_1}${address.address_line_2 ? `, ${address.address_line_2}` : ''}, ${address.city}, ${address.state} ${address.postal_code}`
    });
    router.back();
  };

  const confirmSelection = () => {
    const chosen = addresses.find(addr => addr.id === selectedId);
    if (chosen) {
      selectAddress(chosen);
    }
  };

  const addNewAddress = () => {
    router.push('/customer/add-address');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Select Address" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderTagIcon = (tag?: string) => {
    switch (tag) {
      case 'work':
        return <Icon name="BriefcaseSolid" size="md" color={theme.colors.text} />;
      case 'custom':
        return <Icon name="HeartSolid" size="md" color={theme.colors.text} />;
      default:
        return <Icon name="HomeFill" size="md" color={theme.colors.text} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Select Address" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.searchBar}>
          <Icon name="Search" size="md" color={theme.colors.textMuted} />
          <TextInput placeholder="Enter a new address" placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} />
        </View>

        <TouchableOpacity style={styles.useLocationCard} onPress={addNewAddress}>
          <View style={styles.useLocationLeft}>
            <View style={styles.useLocationIcon}>
              <Icon name="Navigation" size="md" color={theme.colors.primary[500]} />
            </View>
            <View>
              <Text style={styles.useLocationTitle}>Use current location</Text>
              <Text style={styles.useLocationSubtitle}>Springfield, IL</Text>
            </View>
          </View>
          <Icon name="ChevronRight" size="md" color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Addresses List */}
        {addresses.length > 0 ? (
          <View style={styles.addressesList}>
            {addresses.map((address) => (
              <TouchableOpacity key={address.id} style={[styles.addressCard, selectedId === address.id && styles.addressCardActive]} onPress={() => setSelectedId(address.id)} activeOpacity={0.9}>
                <View style={styles.cardTop}>
                  <View style={styles.iconBadge}>{renderTagIcon(address.tag)}</View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.addressLabel}>{address.label}</Text>
                      {address.is_default && <View style={styles.defaultPill}><Text style={styles.defaultPillText}>Default</Text></View>}
                    </View>
                    <Text style={styles.addressText}>
                      {address.address_line_1}
                      {address.address_line_2 ? `, ${address.address_line_2}` : ''}
                    </Text>
                    <Text style={styles.addressTextMuted}>
                      {address.city}, {address.state} {address.postal_code}
                    </Text>
                  </View>
                  <View style={[styles.radioOuter, selectedId === address.id && styles.radioOuterActive]}>
                    {selectedId === address.id && <View style={styles.radioInner} />}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addCard} onPress={addNewAddress}>
              <Icon name="Plus" size="md" color={theme.colors.primary[500]} />
              <Text style={styles.addCardText}>Add new address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="MapPinFill" size={64} color={theme.colors.textSubtle} />
            <Text style={styles.emptyTitle}>No addresses yet</Text>
            <Text style={styles.emptyText}>
              Add your first delivery address to continue
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Confirm Location" onPress={confirmSelection} disabled={!selectedId} fullWidth />
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
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    scrollContent: { paddingBottom: 140, gap: 16 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    searchInput: { flex: 1, fontFamily: 'Inter-Regular', color: theme.colors.text },
    useLocationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    useLocationLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    useLocationIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    useLocationTitle: { fontFamily: 'Inter-SemiBold', color: theme.colors.text, fontSize: 16 },
    useLocationSubtitle: { fontFamily: 'Inter-Regular', color: theme.colors.textMuted, fontSize: 13 },
    addressesList: {
      gap: 16,
    },
    addressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    addressCardActive: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[50] },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBadge: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: { flex: 1, gap: 4 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addressLabel: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: theme.colors.text },
    defaultPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.colors.statusSoft.success,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.status.success,
    },
    defaultPillText: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: theme.colors.status.success },
    addressText: { fontSize: 14, color: theme.colors.text, fontFamily: 'Inter-Regular', lineHeight: 20 },
    addressTextMuted: { fontSize: 13, color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterActive: { borderColor: theme.colors.primary[500] },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary[500] },
    addCard: {
      padding: 16,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    addCardText: { fontFamily: 'Inter-SemiBold', color: theme.colors.primary[500], fontSize: 15 },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 64,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
      lineHeight: 24,
    },
    footer: {
      padding: 16,
      paddingBottom: 16 + theme.insets.bottom,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
  });
