import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Location from 'expo-location';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import FormToggle from '@/components/ui/FormToggle';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { createUserAddress, getUserAddresses } from '@/utils/database';
import { addressSchema, AddressFormData } from '@/utils/validation/schemas';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

const addressTypeOptions = [
  { label: 'Home', value: 'Home' },
  { label: 'Work', value: 'Work' },
  { label: 'Other', value: 'Other' },
];

export default function AddAddress() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geoCountry, setGeoCountry] = useState<string | undefined>(undefined);
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    control,
    handleSubmit,
    formState: { isValid },
    setValue,
    watch,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    mode: 'onChange',
    defaultValues: {
      label: 'Home',
      tag: 'home',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      deliveryInstructions: '',
      isDefault: false,
      latitude: undefined,
      longitude: undefined,
      country: '',
    },
  });
  const postalCode = watch('postalCode');
  const tag = watch('tag');

  const checkIfFirstAddress = useCallback(async () => {
    if (!user) return;

    try {
      const existingAddresses = await getUserAddresses(user.id);
      if (existingAddresses.length === 0) {
        setValue('isDefault', true);
      }
    } catch (error) {
      console.error('Error checking existing addresses:', error);
    }
  }, [setValue, user]);

  useEffect(() => {
    checkIfFirstAddress();
  }, [checkIfFirstAddress]);

  const getCurrentLocationAndAddress = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Location Not Available',
        'GPS location is not available on web. Please enter your address manually.'
      );
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationError('Location permission is required to use GPS');
        Alert.alert(
          'Permission Required',
          'Location permission is required to use your current location. Please enable it in your device settings.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setValue('latitude', latitude);
      setValue('longitude', longitude);

      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];

        if (address.streetNumber && address.street) {
          setValue('addressLine1', `${address.streetNumber} ${address.street}`);
        } else if (address.street) {
          setValue('addressLine1', address.street);
        }

        if (address.city) {
          setValue('city', address.city);
        }

        if (address.region) {
          setValue('state', address.region);
        }

        if (address.postalCode) {
          setValue('postalCode', address.postalCode);
        }

        if (address.country) {
          setValue('country', address.country);
          setGeoCountry(address.country);
        }

        Alert.alert(
          'Location Found',
          'Your current location has been used to fill in the address fields. Please review and adjust if needed.'
        );
      } else {
        Alert.alert(
          'Address Not Found',
          'Could not determine address from your location. Please enter the address manually.'
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      let errorMessage = 'Failed to get your current location. ';

      const err = error as any;
      if (err?.code === 'E_LOCATION_TIMEOUT') {
        errorMessage += 'Location request timed out. Please try again.';
      } else if (err?.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage += 'Location services are not available.';
      } else {
        errorMessage += 'Please check your location settings and try again.';
      }

      setLocationError(errorMessage);
      Alert.alert('Location Error', errorMessage);
    } finally {
      setLocationLoading(false);
    }
  };

  const onSubmit = async (data: AddressFormData) => {
    if (!user) return;

    setSaving(true);

    try {
      const normalizedTag = (() => {
        const raw = (data.label || data.tag || 'other').toLowerCase();
        return ['home', 'work', 'other'].includes(raw) ? (raw as AddressFormData['tag']) : 'custom';
      })();
      const newAddress = {
        user_id: user.id,
        label: data.label,
        address_line_1: data.addressLine1,
        address_line_2: data.addressLine2 || undefined,
        city: data.city,
        state: data.state.trim(),
        postal_code: data.postalCode?.trim() || '00000',
        country: (data.country?.trim() || geoCountry || 'US'),
        is_default: data.isDefault || false,
        delivery_instructions: data.deliveryInstructions || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        tag: normalizedTag,
      };

      const { address, errorCode, errorMessage } = await createUserAddress(newAddress);

      if (address) {
        Alert.alert('Success', 'Address added successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        let friendly = 'Failed to add address';
        if (errorCode === '42501') {
          friendly = 'You do not have permission to add an address with this account.';
        } else if (errorCode === '23505') {
          friendly = 'You already have an address with this label. Choose a different label (e.g., Home 2).';
        }
        console.warn('createUserAddress failed', { errorCode, errorMessage });
        Alert.alert('Error', friendly);
      }
    } catch (error) {
      console.error('Error adding address:', error);
      Alert.alert('Error', 'Failed to add address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Add Address" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.locationCard} onPress={getCurrentLocationAndAddress} activeOpacity={0.9}>
          <View style={styles.locationLeft}>
            <View style={styles.locationIcon}>
              <Icon name="Navigation" size="md" color={theme.colors.primary[500]} />
            </View>
            <View>
              <Text style={styles.locationTitle}>{locationLoading ? 'Locating...' : 'Use current location'}</Text>
              <Text style={styles.locationSubtitle}>Tap to autofill address</Text>
            </View>
          </View>
          <Icon name="ChevronRight" size="md" color={theme.colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.noticeCard}>
          <Icon name="Info" size="sm" color={theme.colors.textMuted} />
          <Text style={styles.noticeText}>
            Browser permissions are required for GPS. If location fails, enter your address manually below.
          </Text>
        </View>

        {locationError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{locationError}</Text>
          </View>
        )}

        {Platform.OS === 'web' && (
          <View style={styles.webNotice}>
            <Text style={styles.webNoticeText}>
              📍 GPS location is not available on web. Please enter your address manually.
            </Text>
          </View>
        )}

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tag this address</Text>
          <View style={styles.tagRow}>
            {addressTypeOptions.map(option => {
              const isActive = (tag || '').toLowerCase() === option.value.toLowerCase();
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.tagPill, isActive && styles.tagPillActive]}
                  onPress={() => {
                    setValue('tag', option.value.toLowerCase() as AddressFormData['tag'], { shouldValidate: true });
                    setValue('label', option.value);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.tagText, isActive && styles.tagTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Details</Text>

          <FormField
            control={control}
            name="addressLine1"
            label="Street Address"
            placeholder="123 Main Street"
            autoCapitalize="words"
          />

          <FormField
            control={control}
            name="addressLine2"
            label="Apartment, Suite, etc. (Optional)"
            placeholder="Apt 4B, Suite 100, etc."
            autoCapitalize="words"
          />

          <View style={styles.rowContainer}>
            <FormField
              control={control}
              name="city"
              label="City"
              placeholder="City"
              autoCapitalize="words"
              style={styles.flex1}
            />

            <FormField
              control={control}
              name="state"
              label="State / Region"
              placeholder="State or Region"
              autoCapitalize="words"
              maxLength={50}
              style={[styles.flex1, styles.marginLeft]}
            />
          </View>

          <FormField
            control={control}
            name="country"
            label="Country"
            placeholder="Country"
            autoCapitalize="words"
          />

          <FormField
            control={control}
            name="postalCode"
            label="Zip Code"
            placeholder="4-digit zip"
            keyboardType="default"
            maxLength={20}
          />
          {postalCode && postalCode.length > 0 && postalCode.length < 4 && (
            <Text style={styles.validationText}>Zip code must be 4 digits</Text>
          )}
        </View>

        <View style={styles.section}>
          <FormField
            control={control}
            name="deliveryInstructions"
            label="Delivery Instructions (Optional)"
            placeholder="e.g., Gate code is 1234, leave at front door."
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <FormToggle
            control={control}
            name="isDefault"
            label="Set as default address"
            description="This will be used for your future orders"
          />
        </View>

        {watch('latitude') && watch('longitude') && (
          <View style={styles.section}>
            <View style={styles.locationInfo}>
              <Icon name="Navigation" size="sm" color={theme.colors.status.success} />
              <Text style={styles.locationInfoText}>
                GPS coordinates saved for accurate delivery
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <Button
          title={saving ? "Saving..." : "Save Address"}
          onPress={handleSubmit(onSubmit)}
          disabled={saving || !isValid}
        />
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
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    scrollContent: {
      paddingBottom: 120,
      gap: 12,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    locationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    locationLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    locationIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: theme.colors.text, marginBottom: 2 },
    locationSubtitle: { fontSize: 14, fontFamily: 'Inter-Regular', color: theme.colors.textMuted },
    noticeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.md,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    noticeText: { flex: 1, fontFamily: 'Inter-Regular', color: theme.colors.textMuted, fontSize: 13 },
    errorContainer: {
      backgroundColor: theme.colors.statusSoft.error,
      borderWidth: 1,
      borderColor: theme.colors.status.error,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
    },
    webNotice: {
      backgroundColor: theme.colors.primary[50],
      borderWidth: 1,
      borderColor: theme.colors.primary[100],
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
    },
    webNoticeText: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
    },
    rowContainer: {
      flexDirection: 'row',
    },
    flex1: {
      flex: 1,
    },
    marginLeft: {
      marginLeft: 12,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    divider: { flex: 1, height: 1, backgroundColor: theme.colors.border },
    dividerText: { fontFamily: 'Inter-SemiBold', color: theme.colors.textSubtle, fontSize: 12 },
    tagRow: {
      flexDirection: 'row',
      gap: 10,
    },
    tagPill: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    tagPillActive: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[50],
    },
    tagText: { fontFamily: 'Inter-Medium', color: theme.colors.text },
    tagTextActive: { color: theme.colors.primary[600] },
    validationText: { color: theme.colors.status.error, fontFamily: 'Inter-Medium', marginTop: 6 },
    locationInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.statusSoft.success,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.status.success,
    },
    locationInfoText: {
      fontSize: 14,
      color: theme.colors.status.success,
      fontFamily: 'Inter-Medium',
      marginLeft: 8,
    },
    bottomContainer: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
  });
