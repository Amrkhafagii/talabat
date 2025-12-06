import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, Clock, MapPin, Phone, Mail, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { ensureRestaurantForUser, toggleRestaurantOpen, upsertRestaurantHours, updateRestaurant } from '@/utils/database';
import { Restaurant } from '@/types/database';
import type { RestaurantHourInput } from '@/utils/db/restaurants';
import { logMutationError } from '@/utils/telemetry';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildDefaultHours(existing?: Restaurant['restaurant_hours']): RestaurantHourInput[] {
  const base: RestaurantHourInput[] = Array.from({ length: 7 }, (_, idx) => ({
    day_of_week: idx,
    open_time: '09:00',
    close_time: '21:00',
    is_closed: false,
  }));

  if (!existing || existing.length === 0) return base;

  return base.map((day) => {
    const match = existing.find((h) => h.day_of_week === day.day_of_week);
    if (!match) return day;
    return {
      day_of_week: day.day_of_week,
      open_time: match.open_time ?? '09:00',
      close_time: match.close_time ?? '21:00',
      is_closed: match.is_closed ?? false,
    };
  });
}

export default function RestaurantSettings() {
  const { user, signOut } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});

  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [hours, setHours] = useState<RestaurantHourInput[]>(buildDefaultHours());
  const [form, setForm] = useState({
    phone: '',
    email: '',
    address: '',
    deliveryFee: '',
    minimumOrder: '',
    deliveryRadius: '',
  });

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login' as any);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRestaurantData();
    }
  }, [user]);

  const loadRestaurantData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const restaurantData = await ensureRestaurantForUser(user.id);
      setRestaurant(restaurantData);
      if (restaurantData) {
        setIsOpen(restaurantData.is_open);
        setHours(buildDefaultHours(restaurantData.restaurant_hours));
        setForm({
          phone: restaurantData.phone || '',
          email: restaurantData.email || '',
          address: restaurantData.address || '',
          deliveryFee: restaurantData.delivery_fee?.toString() || '',
          minimumOrder: restaurantData.minimum_order?.toString() || '',
          deliveryRadius: restaurantData.delivery_radius_km?.toString() || '',
        });
        setCoords({ lat: restaurantData.latitude, lng: restaurantData.longitude });
      }
    } catch (error) {
      console.error('Error loading restaurant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddressFromGeo = (geo?: Location.LocationGeocodedAddress) => {
    if (!geo) return '';
    const parts = [
      geo.name,
      geo.street,
      geo.city || geo.subregion,
      geo.region,
      geo.postalCode,
      geo.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Enable location to set your restaurant address.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      const [geo] = await Location.reverseGeocodeAsync(position.coords);
      const formattedAddress = formatAddressFromGeo(geo);
      if (formattedAddress) {
        setForm((prev) => ({ ...prev, address: formattedAddress }));
      }
    } catch (err) {
      console.error('Error fetching current location', err);
      logMutationError('settings.location.fetch.failed', { err: String(err) });
      Alert.alert('Error', 'Could not fetch your current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleToggleOpen = async () => {
    if (!restaurant) return;
    try {
      setTogglingOpen(true);
      const nextOpen = !isOpen;
      const success = await toggleRestaurantOpen(restaurant.id, nextOpen);
      if (success) {
        setIsOpen(nextOpen);
        setRestaurant((prev) => (prev ? { ...prev, is_open: nextOpen } : prev));
      } else {
        Alert.alert('Error', 'Failed to update open status');
      }
    } catch (err) {
      console.error('Error toggling open state', err);
      logMutationError('settings.toggleOpen.failed', { err: String(err) });
      Alert.alert('Error', 'Failed to update open status');
    } finally {
      setTogglingOpen(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!restaurant) return;

    const deliveryFee = parseFloat(form.deliveryFee || '0');
    const minimumOrder = parseFloat(form.minimumOrder || '0');
    const deliveryRadius = form.deliveryRadius ? parseFloat(form.deliveryRadius) : undefined;

    if (isNaN(deliveryFee) || isNaN(minimumOrder)) {
      Alert.alert('Invalid input', 'Delivery fee and minimum order must be valid numbers.');
      return;
    }
    if (deliveryRadius !== undefined && isNaN(deliveryRadius)) {
      Alert.alert('Invalid input', 'Delivery radius must be a valid number.');
      return;
    }

    try {
      setSavingDetails(true);
      const payload: Partial<Restaurant> = {
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        delivery_fee: deliveryFee,
        minimum_order: minimumOrder,
      };

      if (deliveryRadius !== undefined) {
        (payload as any).delivery_radius_km = deliveryRadius;
      }
      if (coords.lat !== undefined && coords.lng !== undefined) {
        payload.latitude = coords.lat;
        payload.longitude = coords.lng;
      }

      const { success, error } = await updateRestaurant(restaurant.id, payload);
      if (success) {
        setRestaurant((prev) => (prev ? { ...prev, ...payload } as Restaurant : prev));
        Alert.alert('Saved', 'Restaurant details updated.');
      } else {
        Alert.alert('Error', error || 'Failed to save details.');
      }
    } catch (err) {
      console.error('Error saving details', err);
      logMutationError('settings.details.save.failed', { err: String(err) });
      Alert.alert('Error', 'Failed to save details.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSaveHours = async () => {
    if (!restaurant) return;
    try {
      setSavingHours(true);
      const success = await upsertRestaurantHours(restaurant.id, hours);
      if (success) {
        Alert.alert('Saved', 'Operating hours updated.');
      } else {
        Alert.alert('Error', 'Failed to update operating hours.');
      }
    } catch (err) {
      console.error('Error saving hours', err);
      logMutationError('settings.hours.save.failed', { err: String(err) });
      Alert.alert('Error', 'Failed to update operating hours.');
    } finally {
      setSavingHours(false);
    }
  };

  const updateHourRow = (day: number, field: 'open_time' | 'close_time' | 'is_closed', value: string | boolean) => {
    setHours((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, [field]: value } : h)));
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login' as any);
          } catch (err) {
            console.error('Sign out failed', err);
            Alert.alert('Error', 'Could not sign out. Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantInfo}>
            <View style={styles.restaurantIcon}>
              <Store size={24} color="#FF6B35" />
            </View>
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantName}>{restaurant?.name || 'Restaurant Name'}</Text>
              <Text style={styles.restaurantCuisine}>{restaurant?.cuisine || 'Cuisine Type'}</Text>
              <Text style={styles.restaurantAddress}>{restaurant?.address || 'Restaurant Address'}</Text>
            </View>
          </View>

          <View style={styles.restaurantStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{restaurant?.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{restaurant?.total_reviews || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isOpen ? '#10B981' : '#EF4444' }]}>
                {isOpen ? 'Open' : 'Closed'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Clock size={20} color="#FF6B35" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Open for orders</Text>
                <Text style={styles.settingSubtitle}>Control whether customers can place orders right now</Text>
              </View>
            </View>
            <Switch
              value={isOpen}
              onValueChange={handleToggleOpen}
              disabled={togglingOpen}
              thumbColor={isOpen ? '#FF6B35' : '#FFFFFF'}
              trackColor={{ false: '#E5E7EB', true: '#FFE1D6' }}
            />
          </View>
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact & Address</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={16} color="#6B7280" />
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(v) => setForm((prev) => ({ ...prev, phone: v }))}
                placeholder="e.g. +20123456789"
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWithIcon}>
              <Mail size={16} color="#6B7280" />
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={(v) => setForm((prev) => ({ ...prev, email: v }))}
                placeholder="owner@restaurant.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address</Text>
            <View style={styles.inputWithIcon}>
              <MapPin size={16} color="#6B7280" />
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={(v) => setForm((prev) => ({ ...prev, address: v }))}
                placeholder="123 Street, City"
              />
            </View>
            <View style={styles.locationHelperRow}>
              <Text style={styles.helperText}>
                Current location: {coords.lat && coords.lng ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Not set'}
              </Text>
              <TouchableOpacity style={styles.secondaryPill} onPress={handleUseCurrentLocation} disabled={locationLoading}>
                <Text style={styles.secondaryPillText}>{locationLoading ? 'Getting location...' : 'Use my location'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              We save your coordinates so customers can find nearby restaurants. Update anytime by fetching your current location.
            </Text>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveDetails} disabled={savingDetails}>
            <Text style={styles.primaryButtonText}>{savingDetails ? 'Saving...' : 'Save Contact & Address'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Delivery Settings</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.inputLabel}>Delivery Fee</Text>
              <TextInput
                style={styles.input}
                value={form.deliveryFee}
                onChangeText={(v) => setForm((prev) => ({ ...prev, deliveryFee: v }))}
                keyboardType='decimal-pad'
                placeholder="0.00"
              />
            </View>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.inputLabel}>Minimum Order</Text>
              <TextInput
                style={styles.input}
                value={form.minimumOrder}
                onChangeText={(v) => setForm((prev) => ({ ...prev, minimumOrder: v }))}
                keyboardType='decimal-pad'
                placeholder="0.00"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Delivery Radius (km)</Text>
            <TextInput
              style={styles.input}
              value={form.deliveryRadius}
              onChangeText={(v) => setForm((prev) => ({ ...prev, deliveryRadius: v }))}
              keyboardType='decimal-pad'
              placeholder="10"
            />
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveDetails} disabled={savingDetails}>
            <Text style={styles.primaryButtonText}>{savingDetails ? 'Saving...' : 'Save Delivery Settings'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          {hours.map((h) => (
            <View key={h.day_of_week} style={styles.hoursRow}>
              <Text style={styles.dayLabel}>{dayNames[h.day_of_week]}</Text>
              <View style={styles.hoursInputs}>
                <TextInput
                  style={[styles.hoursInput, h.is_closed && styles.inputDisabled]}
                  value={h.open_time || ''}
                  editable={!h.is_closed}
                  onChangeText={(v) => updateHourRow(h.day_of_week, 'open_time', v)}
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.hoursSeparator}>–</Text>
                <TextInput
                  style={[styles.hoursInput, h.is_closed && styles.inputDisabled]}
                  value={h.close_time || ''}
                  editable={!h.is_closed}
                  onChangeText={(v) => updateHourRow(h.day_of_week, 'close_time', v)}
                  placeholder="21:00"
                  keyboardType="numbers-and-punctuation"
                />
                <View style={styles.closedToggle}>
                  <Text style={styles.closedLabel}>Closed</Text>
                  <Switch
                    value={h.is_closed ?? false}
                    onValueChange={(val) => updateHourRow(h.day_of_week, 'is_closed', val)}
                    trackColor={{ false: '#E5E7EB', true: '#FFE1D6' }}
                    thumbColor={(h.is_closed ?? false) ? '#FF6B35' : '#FFFFFF'}
                  />
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveHours} disabled={savingHours}>
            <Text style={styles.primaryButtonText}>{savingHours ? 'Saving...' : 'Save Hours'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  restaurantSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  restaurantIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  restaurantAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  restaurantStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  contactSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  inputGroup: { width: '100%' },
  inputLabel: { fontSize: 14, color: '#374151', fontFamily: 'Inter-Medium', marginBottom: 6 },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    paddingVertical: 10,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginTop: 6,
  },
  locationHelperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  secondaryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  secondaryPillText: {
    color: '#111827',
    fontFamily: 'Inter-Medium',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    width: 60,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  hoursInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoursInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  hoursSeparator: { color: '#6B7280', fontFamily: 'Inter-Regular' },
  closedToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  closedLabel: { fontFamily: 'Inter-Regular', color: '#6B7280' },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginLeft: 8,
  },
});
