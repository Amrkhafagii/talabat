import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react-native';
import * as Location from 'expo-location';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverByUserId, updateDriverLocation } from '@/utils/database';
import { DeliveryDriver } from '@/types/database';

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

  useEffect(() => {
    if (user) {
      loadDriverData();
      requestLocationPermission();
    }
  }, [user]);

  useEffect(() => {
    if (isTracking && driver) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isTracking, driver]);

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

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required for delivery tracking');
        return;
      }

      // Request background location permission for continuous tracking
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        Alert.alert(
          'Background Location',
          'Background location access helps customers track their deliveries. You can enable it in settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setError('Failed to request location permission');
    }
  };

  const startLocationTracking = async () => {
    try {
      // Get current location first
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || 0,
        timestamp: currentLocation.timestamp,
      };

      // Get address from coordinates
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });

        if (addresses.length > 0) {
          const address = addresses[0];
          locationData.address = `${address.street || ''} ${address.city || ''}, ${address.region || ''}`.trim();
        }
      } catch (addressError) {
        console.log('Could not get address:', addressError);
      }

      setLocation(locationData);
      setLastUpdate(new Date());

      // Update driver location in database
      if (driver) {
        await updateDriverLocation(
          driver.id,
          locationData.latitude,
          locationData.longitude
        );
      }

      // Start continuous tracking
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 50, // Update when moved 50 meters
        },
        async (newLocation) => {
          const newLocationData: LocationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy || 0,
            timestamp: newLocation.timestamp,
          };

          setLocation(newLocationData);
          setLastUpdate(new Date());

          // Update driver location in database
          if (driver) {
            await updateDriverLocation(
              driver.id,
              newLocationData.latitude,
              newLocationData.longitude
            );
          }
        }
      );

      setError(null);
    } catch (err) {
      console.error('Error starting location tracking:', err);
      setError('Failed to start location tracking');
      setIsTracking(false);
    }
  };

  const stopLocationTracking = () => {
    setLocation(null);
    setLastUpdate(null);
  };

  const toggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      Alert.alert('Location Tracking', 'Location tracking has been stopped.');
    } else {
      setIsTracking(true);
    }
  };

  const refreshLocation = async () => {
    if (!isTracking) return;

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || 0,
        timestamp: currentLocation.timestamp,
      };

      setLocation(locationData);
      setLastUpdate(new Date());

      if (driver) {
        await updateDriverLocation(
          driver.id,
          locationData.latitude,
          locationData.longitude
        );
      }
    } catch (err) {
      console.error('Error refreshing location:', err);
      Alert.alert('Error', 'Failed to refresh location');
    }
  };

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
              {isTracking ? (
                <Wifi size={20} color="#10B981" />
              ) : (
                <WifiOff size={20} color="#EF4444" />
              )}
              <Text style={[
                styles.statusText,
                { color: isTracking ? '#10B981' : '#EF4444' }
              ]}>
                {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshLocation}
              disabled={!isTracking}
            >
              <RefreshCw size={20} color={isTracking ? '#6B7280' : '#9CA3AF'} />
            </TouchableOpacity>
          </View>

          {lastUpdate && (
            <View style={styles.lastUpdateContainer}>
              <Clock size={16} color="#6B7280" />
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
                <MapPin size={16} color="#FF6B35" />
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

              {location.address && (
                <View style={styles.addressContainer}>
                  <Text style={styles.addressLabel}>Address</Text>
                  <Text style={styles.addressText}>{location.address}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginLeft: 6,
  },
  locationCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
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
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
    flex: 1,
  },
  locationValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter-Medium',
  },
  accuracyDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  addressContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addressLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#111827',
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
    color: '#374151',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  privacyNote: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  controlContainer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
});
