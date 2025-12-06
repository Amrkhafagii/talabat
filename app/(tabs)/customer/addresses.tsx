import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MapPin, Plus, CreditCard as Edit, Trash2, Star } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAddresses, deleteUserAddress, updateUserAddress } from '@/utils/database';
import { UserAddress } from '@/types/database';

export default function Addresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);

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
          <ActivityIndicator size="large" color="#FF6B35" />
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
          <Plus size={24} color="#FF6B35" />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>

        {/* Addresses List */}
        {addresses.length > 0 ? (
          <View style={styles.addressesList}>
            {addresses.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressLabelContainer}>
                    <MapPin size={20} color="#FF6B35" />
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    {address.is_default && (
                      <View style={styles.defaultBadge}>
                        <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => editAddress(address)}
                    >
                      <Edit size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleDeleteAddress(address)}
                    >
                      <Trash2 size={16} color="#EF4444" />
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
            <MapPin size={64} color="#9CA3AF" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FF6B35',
    marginLeft: 8,
  },
  addressesList: {
    gap: 16,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#111827',
    marginLeft: 8,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 10,
    color: '#FFFFFF',
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
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressDetails: {
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  instructionsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    marginTop: 4,
  },
  setDefaultButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF7F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  setDefaultText: {
    fontSize: 12,
    color: '#FF6B35',
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
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 16,
  },
});
