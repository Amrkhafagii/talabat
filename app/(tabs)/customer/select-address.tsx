import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MapPin, Plus, Star } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAddresses } from '@/utils/database';
import { UserAddress } from '@/types/database';
import { useAppTheme } from '@/styles/appTheme';

export default function SelectAddress() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useAppTheme();
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
    } finally {
      setLoading(false);
    }
  };

  const selectAddress = (address: UserAddress) => {
    // Pass the selected address back to the cart
    router.setParams({
      selectedAddressId: address.id,
      selectedAddressLabel: address.label,
      selectedAddressText: `${address.address_line_1}${address.address_line_2 ? `, ${address.address_line_2}` : ''}, ${address.city}, ${address.state} ${address.postal_code}`
    });
    router.back();
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

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Select Address" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Add New Address */}
        <TouchableOpacity style={styles.addButton} onPress={addNewAddress}>
          <Plus size={24} color={theme.colors.primary[500]} />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>

        {/* Addresses List */}
        {addresses.length > 0 ? (
          <View style={styles.addressesList}>
            {addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={styles.addressCard}
                onPress={() => selectAddress(address)}
              >
                <View style={styles.addressHeader}>
                  <View style={styles.addressLabelContainer}>
                    <MapPin size={20} color={theme.colors.primary[500]} />
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    {address.is_default && (
                      <View style={styles.defaultBadge}>
                        <Star size={12} color={theme.colors.textInverse} fill={theme.colors.textInverse} />
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
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
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MapPin size={64} color={theme.colors.textSubtle} />
            <Text style={styles.emptyTitle}>No addresses yet</Text>
            <Text style={styles.emptyText}>
              Add your first delivery address to continue
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
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
    },
    addressHeader: {
      marginBottom: 12,
    },
    addressLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
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
    addressDetails: {
      marginLeft: 28,
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
  });
