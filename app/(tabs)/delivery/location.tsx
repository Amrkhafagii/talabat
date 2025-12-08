import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react-native';
import * as Location from 'expo-location';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverByUserId } from '@/utils/database';
import { DeliveryDriver } from '@/types/database';
import { useDriverLocationTracking } from '@/hooks/useDriverLocationTracking';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

export default function LocationTracking() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { startTracking, stopTracking, isTracking: hookTracking } = useDriverLocationTracking({
    driverId: driver?.id,
    onError: setError,
    onLocation: async (coords, timestamp) => {
      setLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || 0,
        timestamp,
      });
      setLastUpdate(new Date(timestamp));

      const prev = lastCoordsRef.current;
      const moved = !prev || prev.lat !== coords.latitude || prev.lng !== coords.longitude;
      if (moved) {
        lastCoordsRef.current = { lat: coords.latitude, lng: coords.longitude };
        try {
          const addresses = await Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          if (addresses.length > 0) {
            const addr = addresses[0];
            setAddress(`${addr.street || ''} ${addr.city || ''}, ${addr.region || ''}`.trim());
            setLocation(prev => prev ? { ...prev, address: `${addr.street || ''} ${addr.city || ''}, ${addr.region || ''}`.trim() } : prev);
          }
        } catch (addrErr) {
          console.log('Could not get address:', addrErr);
        }
      }
    },
  });

  const effectiveTracking = useMemo(() => isTracking || hookTracking, [isTracking, hookTracking]);

  useEffect(() => {
    if (user) {
      loadDriverData();
    }
  }, [user]);

  const loadDriverData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const driverData = await getDriverByUserId(user.id);
      if (driverData) {
        setDriver(driverData);
        setIsTracking(driverData.is_online);
      }
    } catch (err) {
      console.error('Error loading driver data:', err);
      setError('Failed to load driver profile');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = useCallback(async () => {
    try {
      const started = await startTracking();
      if (!started) {
        setIsTracking(false);
        return;
      }
      setError(null);
    } catch (err) {
      console.error('Error starting location tracking:', err);
      setError('Failed to start location tracking');
      setIsTracking(false);
    }
  }, [startTracking]);

  const stopLocationTracking = useCallback(() => {
    stopTracking();
  }, [stopTracking]);

  const toggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      Alert.alert('Location Tracking', 'Location tracking has been stopped.');
    } else {
      setIsTracking(true);
    }
  };

  const refreshLocation = useCallback(async () => {
    if (!isTracking) return;
    // Restart tracking to force immediate update
    stopTracking();
    await startLocationTracking();
  }, [isTracking, startLocationTracking, stopTracking]);

  useEffect(() => {
    if (!driver?.id) return;
    if (isTracking) {
      startLocationTracking();
    } else {
      stopLocationTracking();
      setLocation(null);
      setLastUpdate(null);
      setAddress(undefined);
    }
  }, [driver?.id, isTracking, startLocationTracking, stopLocationTracking]);

  const openInMaps = () => {
    if (!location) return;

    const { latitude, longitude } = location;
    const url = Platform.select({
      ios: `maps:${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}`,
      web: `https://maps.google.com/?q=${latitude},${longitude}`,
    });

    if (url) {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        // For mobile, you would use Linking.openURL(url)
        console.log('Would open:', url);
      }
    }
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatAccuracy = (accuracy: number) => {
    return `±${Math.round(accuracy)}m`;
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Location Tracking" showBackButton />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Location Tracking" showBackButton />

      <View style={styles.content}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIndicator}>
              {effectiveTracking ? (
                <Wifi size={20} color={theme.colors.status.success} />
              ) : (
                <WifiOff size={20} color={theme.colors.status.error} />
              )}
              <Text style={[
                styles.statusText,
                { color: effectiveTracking ? theme.colors.status.success : theme.colors.status.error }
              ]}>
                {effectiveTracking ? 'Tracking Active' : 'Tracking Inactive'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshLocation}
              disabled={!effectiveTracking}
            >
              <RefreshCw size={20} color={effectiveTracking ? theme.colors.textMuted : theme.colors.textSubtle} />
            </TouchableOpacity>
          </View>

          {lastUpdate && (
            <View style={styles.lastUpdateContainer}>
              <Clock size={16} color={theme.colors.textMuted} />
              <Text style={styles.lastUpdateText}>
                Last updated: {formatLastUpdate(lastUpdate)}
              </Text>
            </View>
          )}
        </Card>

        {/* Location Information */}
        {location && (
          <Card style={styles.locationCard}>
            <Text style={styles.cardTitle}>Current Location</Text>
            
            <View style={styles.locationInfo}>
              <View style={styles.locationRow}>
                <MapPin size={16} color={theme.colors.primary[500]} />
                <Text style={styles.locationLabel}>Coordinates</Text>
                <Text style={styles.locationValue}>
                  {formatCoordinates(location.latitude, location.longitude)}
                </Text>
              </View>

              <View style={styles.locationRow}>
                <View style={styles.accuracyDot} />
                <Text style={styles.locationLabel}>Accuracy</Text>
                <Text style={styles.locationValue}>
                  {formatAccuracy(location.accuracy)}
                </Text>
              </View>

              {address && (
                <View style={styles.addressContainer}>
                  <Text style={styles.addressLabel}>Address</Text>
                  <Text style={styles.addressText}>{address}</Text>
                </View>
              )}
            </View>

            <Button
              title="Open in Maps"
              onPress={openInMaps}
              variant="outline"
              style={styles.mapsButton}
            />
          </Card>
        )}

        {/* Privacy Information */}
        <Card style={styles.privacyCard}>
          <Text style={styles.cardTitle}>Privacy & Tracking</Text>
          <Text style={styles.privacyText}>
            Your location is only shared with customers during active deliveries. 
            Location data is used to provide accurate delivery tracking and improve service quality.
          </Text>
          <Text style={styles.privacyNote}>
            You can disable tracking at any time, but this may affect your ability to receive delivery requests.
          </Text>
        </Card>

        {/* Error Display */}
        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Location Error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {/* Control Button */}
        <View style={styles.controlContainer}>
          <Button
            title={isTracking ? 'Stop Tracking' : 'Start Tracking'}
            onPress={toggleTracking}
            variant={isTracking ? 'danger' : 'primary'}
          />
        </View>
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
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    statusCard: {
      marginBottom: 16,
    },
    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      marginLeft: 8,
    },
    refreshButton: {
      padding: 8,
    },
    lastUpdateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    lastUpdateText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginLeft: 6,
    },
    locationCard: {
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    locationInfo: {
      marginBottom: 16,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    locationLabel: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginLeft: 8,
      flex: 1,
    },
    locationValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-Medium',
    },
    accuracyDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.status.success,
    },
    addressContainer: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    addressLabel: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginBottom: 4,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
    },
    mapsButton: {
      marginTop: 8,
    },
    privacyCard: {
      marginBottom: 16,
    },
    privacyText: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
      marginBottom: 12,
    },
    privacyNote: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      lineHeight: 16,
      fontStyle: 'italic',
    },
    errorCard: {
      marginBottom: 16,
      backgroundColor: theme.colors.statusSoft.error,
      borderColor: theme.colors.status.error,
      borderWidth: 1,
    },
    errorTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.status.error,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
    },
    controlContainer: {
      marginTop: 'auto',
      paddingBottom: 20,
    },
  });
