import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react-native';

import ScreenHeader from '@/components/ui/ScreenHeader';
import LabeledInput from '@/components/ui/LabeledInput';
import Button from '@/components/ui/Button';
import Snackbar from '@/components/ui/Snackbar';
import { useAuth } from '@/contexts/AuthContext';
import { ensureRestaurantForUser, toggleRestaurantOpen, upsertRestaurantHours, updateRestaurant } from '@/utils/database';
import type { Restaurant } from '@/types/database';
import type { RestaurantHourInput } from '@/utils/db/restaurants';
import { logMutationError } from '@/utils/telemetry';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

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

export default function OperationalSettings() {
  const { user, signOut } = useAuth();
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [hours, setHours] = useState<RestaurantHourInput[]>(buildDefaultHours());
  const [form, setForm] = useState({ phone: '', email: '', address: '', deliveryFee: '', minimumOrder: '', radius: '' });
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showDelivery, setShowDelivery] = useState(true);
  const [showHours, setShowHours] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (user) loadRestaurant();
  }, [user]);

  const loadRestaurant = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const rest = await ensureRestaurantForUser(user.id);
      setRestaurant(rest);
      if (rest) {
        setIsOpen(rest.is_open);
        setHours(buildDefaultHours(rest.restaurant_hours));
        setForm({
          phone: rest.phone || '',
          email: rest.email || '',
          address: rest.address || '',
          deliveryFee: rest.delivery_fee?.toString() || '',
          minimumOrder: rest.minimum_order?.toString() || '',
          radius: rest.delivery_radius_km?.toString() || '',
        });
        setCoords({ lat: rest.latitude, lng: rest.longitude });
      }
    } catch (err) {
      console.error('Load settings failed', err);
      setToast({ msg: 'Failed to load settings.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await signOut();
      router.replace('/(auth)/login');
    } catch (err) {
      console.error('logout failed', err);
      Alert.alert('Logout failed', 'Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const handleUseLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Enable location to set your address.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      const [geo] = await Location.reverseGeocodeAsync(position.coords);
      const addr = [geo?.name, geo?.street, geo?.city || geo?.subregion, geo?.region, geo?.postalCode, geo?.country].filter(Boolean).join(', ');
      if (addr) setForm((prev) => ({ ...prev, address: addr }));
    } catch (err) {
      console.error('location error', err);
      logMutationError('settings.location.fetch.failed', { err: String(err) });
      setToast({ msg: 'Could not fetch location.', type: 'error' });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleToggleOpen = async () => {
    if (!restaurant) return;
    try {
      setTogglingOpen(true);
      const next = !isOpen;
      const ok = await toggleRestaurantOpen(restaurant.id, next);
      if (ok) {
        setIsOpen(next);
        setToast({ msg: next ? 'Accepting orders' : 'Paused orders', type: 'success' });
      } else {
        setToast({ msg: 'Failed to update status', type: 'error' });
      }
    } catch (err) {
      console.error('toggle open error', err);
      setToast({ msg: 'Failed to update status', type: 'error' });
    } finally {
      setTogglingOpen(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!restaurant) return;
    const delivery_fee = parseFloat(form.deliveryFee || '0');
    const minimum_order = parseFloat(form.minimumOrder || '0');
    const delivery_radius_km = form.radius ? parseFloat(form.radius) : undefined;
    if (Number.isNaN(delivery_fee) || Number.isNaN(minimum_order) || (delivery_radius_km !== undefined && Number.isNaN(delivery_radius_km))) {
      setToast({ msg: 'Enter valid numbers.', type: 'error' });
      return;
    }
    try {
      setSaving(true);
      const payload: Partial<Restaurant> = {
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        delivery_fee,
        minimum_order,
        ...(delivery_radius_km !== undefined ? { delivery_radius_km } : {}),
        ...(coords.lat !== undefined ? { latitude: coords.lat } : {}),
        ...(coords.lng !== undefined ? { longitude: coords.lng } : {}),
      };
      const { success, error } = await updateRestaurant(restaurant.id, payload);
      if (success) {
        setToast({ msg: 'Business info saved.', type: 'success' });
      } else {
        setToast({ msg: error || 'Save failed.', type: 'error' });
      }
    } catch (err) {
      console.error('save details error', err);
      setToast({ msg: 'Save failed.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHours = async () => {
    if (!restaurant) return;
    try {
      setSavingHours(true);
      const ok = await upsertRestaurantHours(restaurant.id, hours);
      setToast({ msg: ok ? 'Operating hours updated.' : 'Failed to update hours.', type: ok ? 'success' : 'error' });
    } catch (err) {
      console.error('save hours error', err);
      setToast({ msg: 'Failed to update hours.', type: 'error' });
    } finally {
      setSavingHours(false);
    }
  };

  const updateHourRow = (day: number, field: 'open_time' | 'close_time' | 'is_closed', value: string | boolean) => {
    setHours((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, [field]: value } : h)));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor={theme.colors.formSurface} />
        <ScreenHeader title="Operational Settings" onBack={() => router.back()} />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loaderText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <ScreenHeader title="Operational Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.insets.bottom + theme.spacing.xl }}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{restaurant?.name?.[0] || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantName} numberOfLines={1}>{restaurant?.name || 'Restaurant'}</Text>
              <Text style={styles.restaurantSubtitle} numberOfLines={2}>
                {restaurant?.cuisine || 'Cuisine'} • {restaurant?.address || 'Address not set'}
              </Text>
            </View>
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Accepting Orders</Text>
            <Switch
              value={isOpen}
              onValueChange={handleToggleOpen}
              disabled={togglingOpen}
              trackColor={{ false: theme.colors.borderMuted, true: theme.colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <Text style={styles.sectionSubtitle}>Contact details and address</Text>
          <LabeledInput label="Contact Phone" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} keyboardType="phone-pad" />
          <LabeledInput label="Public Email" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} autoCapitalize="none" keyboardType="email-address" />
          <LabeledInput label="Street Address" value={form.address} onChangeText={(v) => setForm((p) => ({ ...p, address: v }))} />
          <TouchableOpacity style={styles.locationButton} onPress={handleUseLocation} disabled={locationLoading}>
            <MapPin size={18} color={theme.colors.accent} />
            <Text style={styles.locationText}>{locationLoading ? 'Fetching location...' : 'Use my current location'}</Text>
          </TouchableOpacity>
        </View>

        <Accordion
          title="Delivery Settings"
          subtitle="Fees and order requirements"
          open={showDelivery}
          onToggle={() => setShowDelivery((p) => !p)}
        >
          <LabeledInput
            label="Delivery Fee"
            value={form.deliveryFee}
            onChangeText={(v) => setForm((p) => ({ ...p, deliveryFee: v }))}
            keyboardType="decimal-pad"
            placeholder="2.99"
          />
          <LabeledInput
            label="Minimum Order"
            value={form.minimumOrder}
            onChangeText={(v) => setForm((p) => ({ ...p, minimumOrder: v }))}
            keyboardType="decimal-pad"
            placeholder="10.00"
          />
          <LabeledInput
            label="Delivery Radius (km)"
            value={form.radius}
            onChangeText={(v) => setForm((p) => ({ ...p, radius: v }))}
            keyboardType="decimal-pad"
            placeholder="10"
          />
        </Accordion>

        <Accordion
          title="Operating Hours"
          subtitle="Set availability for each day"
          open={showHours}
          onToggle={() => setShowHours((p) => !p)}
        >
          {hours.map((h) => (
            <View key={h.day_of_week} style={styles.hourRow}>
              <View style={{ width: 50 }}>
                <Text style={styles.dayLabel}>{dayNames[h.day_of_week]}</Text>
              </View>
              <View style={styles.hourInputs}>
                <TextInput
                  style={[styles.hourInput, h.is_closed && styles.inputDisabled]}
                  value={h.open_time || ''}
                  editable={!h.is_closed}
                  onChangeText={(v) => updateHourRow(h.day_of_week, 'open_time', v)}
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                  placeholderTextColor={theme.colors.formPlaceholder}
                />
                <Text style={styles.hourSeparator}>–</Text>
                <TextInput
                  style={[styles.hourInput, h.is_closed && styles.inputDisabled]}
                  value={h.close_time || ''}
                  editable={!h.is_closed}
                  onChangeText={(v) => updateHourRow(h.day_of_week, 'close_time', v)}
                  placeholder="21:00"
                  keyboardType="numbers-and-punctuation"
                  placeholderTextColor={theme.colors.formPlaceholder}
                />
              </View>
              <View style={styles.closedRow}>
                <Text style={styles.closedLabel}>Closed</Text>
                <Switch value={h.is_closed} onValueChange={(v) => updateHourRow(h.day_of_week, 'is_closed', v)} />
              </View>
            </View>
          ))}
        </Accordion>

        <Button title={saving ? 'Saving...' : 'Save Business Info'} onPress={handleSaveDetails} disabled={saving} style={styles.saveButton} />
        <Button title={savingHours ? 'Saving hours...' : 'Save Operating Hours'} onPress={handleSaveHours} disabled={savingHours} style={styles.saveButton} variant="outline" />
        <Button title={signingOut ? 'Logging out...' : 'Log out'} onPress={handleLogout} disabled={signingOut} style={styles.logoutButton} variant="danger" />
      </ScrollView>

      {toast && (
        <Snackbar
          message={toast.msg}
          type={toast.type === 'success' ? 'success' : 'error'}
          visible
          onClose={() => setToast(null)}
        />
      )}
    </SafeAreaView>
  );
}

function Accordion({ title, subtitle, open, onToggle, children }: { title: string; subtitle?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const theme = useRestaurantTheme();
  return (
    <View style={accordionStyles(theme).wrapper}>
      <TouchableOpacity style={accordionStyles(theme).header} onPress={onToggle} activeOpacity={0.8}>
        <View>
          <Text style={accordionStyles(theme).title}>{title}</Text>
          {subtitle ? <Text style={accordionStyles(theme).subtitle}>{subtitle}</Text> : null}
        </View>
        {open ? <ChevronUp size={18} color={theme.colors.text} /> : <ChevronDown size={18} color={theme.colors.text} />}
      </TouchableOpacity>
      {open ? <View style={accordionStyles(theme).content}>{children}</View> : null}
    </View>
  );
}

function accordionStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    wrapper: {
      marginHorizontal: theme.device.isSmallScreen ? theme.spacing.md : theme.spacing.lg,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    title: { ...theme.typography.subhead },
    subtitle: { ...theme.typography.caption, color: theme.colors.secondaryText },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
  });
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const isCompact = theme.device.isSmallScreen;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
    loaderText: { ...theme.typography.body, color: theme.colors.secondaryText },
    headerCard: {
      backgroundColor: theme.colors.surface,
      padding: isCompact ? theme.spacing.md : theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      ...theme.shadows.card,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatarText: { ...theme.typography.title2 },
    restaurantName: { ...theme.typography.title2 },
    restaurantSubtitle: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: 4 },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.card,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    switchLabel: { ...theme.typography.body, color: theme.colors.formText },
    card: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      marginTop: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    sectionTitle: { ...theme.typography.subhead, marginBottom: theme.spacing.xs },
    sectionSubtitle: { ...theme.typography.caption, color: theme.colors.secondaryText, marginBottom: theme.spacing.sm },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
    },
    locationText: { ...theme.typography.buttonSmall, color: theme.colors.accent },
    hourRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: isCompact ? 'wrap' : 'nowrap',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dayLabel: { ...theme.typography.body, color: theme.colors.formText },
    hourInputs: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: isCompact ? theme.spacing.sm : theme.spacing.md, gap: theme.spacing.xs },
    hourInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.formSurface,
      color: theme.colors.formText,
    },
    hourSeparator: { ...theme.typography.caption, color: theme.colors.secondaryText },
    closedRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginLeft: isCompact ? 0 : theme.spacing.md, marginTop: isCompact ? theme.spacing.xs : 0 },
    closedLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
    inputDisabled: { backgroundColor: theme.colors.formSurfaceAlt, color: theme.colors.formPlaceholder },
    saveButton: { marginHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg, marginTop: theme.spacing.sm },
    logoutButton: {
      marginHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      marginTop: theme.spacing.md,
      marginBottom: theme.insets.bottom + theme.spacing.lg,
    },
  });
}
