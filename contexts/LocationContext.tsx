import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { UserAddress } from '@/types/database';
import { getUserAddresses, setDefaultAddress as persistDefaultAddress } from '@/utils/database';
import { useAuth } from '@/contexts/AuthContext';

type Coordinates = { latitude: number; longitude: number } | null;

interface LocationContextValue {
  coords: Coordinates;
  selectedAddress: UserAddress | null;
  setSelectedAddress: (addr: UserAddress | null) => void;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [coords, setCoords] = useState<Coordinates>(null);
  const [selectedAddress, setSelectedAddressState] = useState<UserAddress | null>(null);

  const refreshLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      setCoords({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch (err) {
      console.error('Error getting location:', err);
    }
  }, []);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  useEffect(() => {
    const loadDefaultAddress = async () => {
      if (!user) return;
      const addresses = await getUserAddresses(user.id);
      const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
      if (defaultAddress) {
        setSelectedAddressState(defaultAddress);
      }
    };
    loadDefaultAddress();
  }, [user]);

  const setSelectedAddress = useCallback((addr: UserAddress | null) => {
    setSelectedAddressState(prev => {
      if (addr?.id && addr.id !== prev?.id) {
        persistDefaultAddress(addr.id).catch(err => console.warn('persistDefaultAddress failed', err));
      }
      return addr;
    });
  }, []);

  return (
    <LocationContext.Provider
      value={{
        coords,
        selectedAddress,
        setSelectedAddress,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext must be used within LocationProvider');
  return ctx;
}
