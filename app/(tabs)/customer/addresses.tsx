import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAddresses, deleteUserAddress, setDefaultAddress } from '@/utils/database';
import { UserAddress } from '@/types/database';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function Addresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [zipError, setZipError] = useState<string | null>(null);
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const loadAddresses = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const addressesData = await getUserAddresses(user.id);
      setAddresses(addressesData);
      const invalidZip = addressesData.find(addr => addr.postal_code && addr.postal_code.length > 0 && addr.postal_code.length < 4);
      setZipError(invalidZip ? 'Zip code must be 4 digits. Please edit your address.' : null);
    } catch (error) {
      console.error('Error loading addresses:', error);
      Alert.alert('Error', 'Failed to load addresses');
    } finally {
      setLoading(false);
      setZipError(null);
    }
  }, [user]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleSetDefault = async (addressId: string) => {
    try {
      const success = await setDefaultAddress(addressId);

      if (success) {
        await loadAddresses(); // Reload to reflect changes
        Alert.alert('Success', 'Default address updated');
      } else {
        Alert.alert('Error', 'Failed to update default address');
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert('Error', 'Failed to update default address');
    }
  };

  const handleDeleteAddress = (address: UserAddress) => {
    if (address.is_default && addresses.length > 1) {
      Alert.alert(
        'Cannot Delete',
        'You cannot delete your default address. Please set another address as default first.'
      );
      return;
    }

    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${address.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteUserAddress(address.id);
              if (result.ok) {
                await loadAddresses();
                Alert.alert('Success', 'Address deleted successfully');
              } else {
                if (result.reason === 'address_has_orders') {
                  Alert.alert('Cannot Delete', 'This address is used in existing orders and cannot be removed.');
                } else {
                  Alert.alert('Error', 'Failed to delete address');
                }
              }
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  const addNewAddress = () => {
    router.push('/customer/add-address');
  };

  const editAddress = (address: UserAddress) => {
    router.push({
      pathname: '/customer/edit-address',
      params: { addressId: address.id }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Delivery Addresses" showBackButton />
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
      <Header title="My Addresses" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.useLocationCard} onPress={addNewAddress}>
          <View style={styles.useLocationLeft}>
            <View style={styles.useLocationIcon}>
              <Icon name="MapTarget" size="md" color={theme.colors.primary[500]} />
            </View>
            <View>
              <Text style={styles.useLocationTitle}>Use current location</Text>
              <Text style={styles.useLocationSubtitle}>Let GPS fill the address fields</Text>
            </View>
          </View>
          <Icon name="ChevronRight" size="md" color={theme.colors.textMuted} />
        </TouchableOpacity>

        {zipError && (
          <View style={styles.errorBar}>
            <Icon name="AlertTriangle" size="sm" color={theme.colors.status.error} />
            <Text style={styles.errorBarText}>{zipError}</Text>
          </View>
        )}

        {/* Addresses List */}
        {addresses.length > 0 ? (
          <View style={styles.addressesList}>
            {addresses.map((address) => (
              <TouchableOpacity key={address.id} style={[styles.addressCard, address.is_default && styles.addressCardActive]} onPress={() => handleSetDefault(address.id)} activeOpacity={0.9}>
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
                  <View style={styles.radioOuter}>{address.is_default && <View style={styles.radioInner} />}</View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionPill} onPress={() => editAddress(address)}>
                    <Icon name="Edit" size="sm" color={theme.colors.primary[600]} />
                    <Text style={styles.actionPillText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionPill} onPress={() => handleDeleteAddress(address)}>
                    <Icon name="Trash2" size="sm" color={theme.colors.status.error} />
                    <Text style={[styles.actionPillText, styles.dangerText]}>Remove</Text>
                  </TouchableOpacity>
                  {!address.is_default && (
                    <TouchableOpacity style={[styles.actionPill, styles.primaryGhost]} onPress={() => handleSetDefault(address.id)}>
                      <Icon name="Star" size="sm" color={theme.colors.primary[500]} />
                      <Text style={[styles.actionPillText, styles.primaryText]}>Set default</Text>
                    </TouchableOpacity>
                  )}
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
            <View style={styles.dottedCard}>
              <Icon name="MapPinFill" size="lg" color={theme.colors.primary[500]} />
              <Text style={styles.emptyTitle}>No addresses yet</Text>
              <Text style={styles.emptyText}>Add a delivery location to speed up checkout.</Text>
            </View>
            <Button title="Add Address" onPress={addNewAddress} style={styles.emptyButton} />
          </View>
        )}
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
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    scrollContent: {
      paddingBottom: 40,
      gap: 16,
    },
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
      borderRadius: 14,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    useLocationTitle: { fontFamily: 'Inter-SemiBold', color: theme.colors.text, fontSize: 16 },
    useLocationSubtitle: { fontFamily: 'Inter-Regular', color: theme.colors.textMuted, fontSize: 13 },
    errorBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.statusSoft.error,
      borderWidth: 1,
      borderColor: theme.colors.status.error,
    },
    errorBarText: {
      color: theme.colors.status.error,
      fontFamily: 'Inter-Medium',
      flex: 1,
    },
    addressesList: {
      gap: 16,
    },
    addressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
      gap: 12,
    },
    addressCardActive: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[50],
    },
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
    addressLabel: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
    },
    addressTextMuted: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    defaultPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.colors.statusSoft.success,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.status.success,
    },
    defaultPillText: {
      fontSize: 12,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.status.success,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.primary[500],
    },
    cardActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    actionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
    },
    actionPillText: { fontFamily: 'Inter-SemiBold', color: theme.colors.text, fontSize: 13 },
    primaryGhost: { backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[500] },
    primaryText: { color: theme.colors.primary[600] },
    dangerText: { color: theme.colors.status.error },
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
      gap: 16,
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    dottedCard: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      padding: 24,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      gap: 8,
    },
    emptyTitle: { fontFamily: 'Inter-SemiBold', color: theme.colors.text, fontSize: 18 },
    emptyText: { fontFamily: 'Inter-Regular', color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
    emptyButton: {
      marginTop: 8,
      alignSelf: 'stretch',
    },
  });
