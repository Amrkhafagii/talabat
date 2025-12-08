import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAddresses, deleteUserAddress, updateUserAddress } from '@/utils/database';
import { UserAddress } from '@/types/database';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function Addresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const addressesData = await getUserAddresses(user.id);
      setAddresses(addressesData);
    } catch (error) {
      console.error('Error loading addresses:', error);
      Alert.alert('Error', 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      // First, remove default from all addresses
      await Promise.all(
        addresses.map(addr => 
          updateUserAddress(addr.id, { is_default: false })
        )
      );

      // Then set the selected address as default
      const success = await updateUserAddress(addressId, { is_default: true });
      
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

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Delivery Addresses" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Add New Address Button */}
        <TouchableOpacity style={styles.addButton} onPress={addNewAddress}>
          <Icon name="Plus" size="lg" color={theme.colors.primary[500]} />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>

        {/* Addresses List */}
        {addresses.length > 0 ? (
          <View style={styles.addressesList}>
            {addresses.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressLabelContainer}>
                    <Icon name="MapPin" size="md" color={theme.colors.primary[500]} />
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    {address.is_default && (
                      <View style={styles.defaultBadge}>
                        <Icon name="Star" size="sm" color={theme.colors.textInverse} />
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => editAddress(address)}
                    >
                      <Icon name="Edit" size="sm" color={theme.colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleDeleteAddress(address)}
                    >
                      <Icon name="Trash2" size="sm" color={theme.colors.status.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.addressDetails}>
                  <Text style={styles.addressText}>
                    {address.address_line_1}
                    {address.address_line_2 && `, ${address.address_line_2}`}
                  </Text>
                  <Text style={styles.addressText}>
                    {address.city}, {address.state} {address.postal_code}
                  </Text>
                  {address.delivery_instructions && (
                    <Text style={styles.instructionsText}>
                      Instructions: {address.delivery_instructions}
                    </Text>
                  )}
                </View>

                {!address.is_default && (
                  <TouchableOpacity 
                    style={styles.setDefaultButton}
                    onPress={() => handleSetDefault(address.id)}
                  >
                    <Text style={styles.setDefaultText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="MapPin" size={64} color={theme.colors.textSubtle} />
            <Text style={styles.emptyTitle}>No addresses yet</Text>
            <Text style={styles.emptyText}>
              Add your first delivery address to start ordering
            </Text>
            <Button
              title="Add Address"
              onPress={addNewAddress}
              style={styles.emptyButton}
            />
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
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.primary[500],
      borderStyle: 'dashed',
      marginBottom: 20,
      ...theme.shadows.card,
    },
    addButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.primary[500],
      marginLeft: 8,
    },
    addressesList: {
      gap: 16,
    },
    addressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    addressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    addressLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    addressLabel: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginLeft: 8,
    },
    defaultBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.status.success,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    defaultText: {
      fontSize: 10,
      color: theme.colors.textInverse,
      fontFamily: 'Inter-SemiBold',
      marginLeft: 4,
    },
    addressActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addressDetails: {
      marginBottom: 12,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
    },
    instructionsText: {
      fontSize: 12,
      color: theme.colors.textSubtle,
      fontFamily: 'Inter-Regular',
      fontStyle: 'italic',
      marginTop: 4,
    },
    setDefaultButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.primary[50],
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.primary[500],
    },
    setDefaultText: {
      fontSize: 12,
      color: theme.colors.primary[500],
      fontFamily: 'Inter-SemiBold',
    },
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
      marginBottom: 24,
    },
    emptyButton: {
      marginTop: 16,
    },
  });
