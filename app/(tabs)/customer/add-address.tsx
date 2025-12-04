import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Location from 'expo-location';
import { MapPin, Navigation } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import FormSelect from '@/components/ui/FormSelect';
import FormToggle from '@/components/ui/FormToggle';
import { useAuth } from '@/contexts/AuthContext';
import { createUserAddress, getUserAddresses } from '@/utils/database';
import { addressSchema, AddressFormData } from '@/utils/validation/schemas';

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

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    mode: 'onChange',
    defaultValues: {
      label: 'Home',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      deliveryInstructions: '',
      isDefault: false,
      latitude: undefined,
      longitude: undefined,
    },
  });

  const selectedLabel = watch('label');

  useEffect(() => {
    // Check if this will be the first address (auto-default)
    checkIfFirstAddress();
  }, [user]);

  const checkIfFirstAddress = async () => {
    if (!user) return;

    try {
      const existingAddresses = await getUserAddresses(user.id);
      if (existingAddresses.length === 0) {
        setValue('isDefault', true);
      }
    } catch (error) {
      console.error('Error checking existing addresses:', error);
    }
  };

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
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Location permission is required to use GPS');
        Alert.alert(
          'Permission Required',
          'Location permission is required to use your current location. Please enable it in your device settings.'
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Store coordinates in form
      setValue('latitude', latitude);
      setValue('longitude', longitude);

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        
        // Populate form fields with geocoded address
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
      const newAddress = {
        user_id: user.id,
        label: data.label,
        address_line_1: data.addressLine1,
        address_line_2: data.addressLine2 || undefined,
        city: data.city,
        state: data.state.toUpperCase(),
        postal_code: data.postalCode,
        country: 'US',
        is_default: data.isDefault || false,
        delivery_instructions: data.deliveryInstructions || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
      };

      const success = await createUserAddress(newAddress);
      
      if (success) {
        Alert.alert('Success', 'Address added successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to add address');
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* GPS Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Fill</Text>
          <View style={styles.gpsContainer}>
            <View style={styles.gpsInfo}>
              <MapPin size={20} color="#FF6B35" />
              <View style={styles.gpsTextContainer}>
                <Text style={styles.gpsTitle}>Use Current Location</Text>
                <Text style={styles.gpsSubtitle}>
                  Automatically fill address fields using GPS
                </Text>
              </View>
            </View>
            <Button
              title={locationLoading ? "Getting Location..." : "Use GPS"}
              onPress={getCurrentLocationAndAddress}
              disabled={locationLoading || Platform.OS === 'web'}
              size="small"
              style={styles.gpsButton}
            />
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
        </View>

        {/* Address Type Selection */}
        <View style={styles.section}>
          <FormSelect
            control={control}
            name="label"
            label="Address Type"
            options={addressTypeOptions}
          />
        </View>

        {/* Address Details */}
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
              placeholder="New York"
              autoCapitalize="words"
              style={styles.flex1}
            />

            <FormField
              control={control}
              name="state"
              label="State"
              placeholder="NY"
              autoCapitalize="characters"
              maxLength={2}
              style={[styles.flex1, styles.marginLeft]}
            />
          </View>

          <FormField
            control={control}
            name="postalCode"
            label="Postal Code"
            placeholder="10001"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        {/* Delivery Instructions */}
        <View style={styles.section}>
          <FormField
            control={control}
            name="deliveryInstructions"
            label="Delivery Instructions (Optional)"
            placeholder="e.g., Ring doorbell, Leave at door, Call when arrived..."
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Set as Default */}
        <View style={styles.section}>
          <FormToggle
            control={control}
            name="isDefault"
            label="Set as default address"
            description="Use this address for future orders"
          />
        </View>

        {/* Location Info */}
        {watch('latitude') && watch('longitude') && (
          <View style={styles.section}>
            <View style={styles.locationInfo}>
              <Navigation size={16} color="#10B981" />
              <Text style={styles.locationInfoText}>
                GPS coordinates saved for accurate delivery
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gpsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gpsTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  gpsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  gpsSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  gpsButton: {
    marginLeft: 12,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  webNotice: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  webNoticeText: {
    fontSize: 14,
    color: '#92400E',
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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  locationInfoText: {
    fontSize: 14,
    color: '#065F46',
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
