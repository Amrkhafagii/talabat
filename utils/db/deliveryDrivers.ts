import { supabase } from '../supabase';
import { DeliveryDriver } from '@/types/database';

export async function getDriverByUserId(userId: string): Promise<DeliveryDriver | null> {
  const { data, error } = await supabase
    .from('delivery_drivers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching driver:', error);
    return null;
  }

  return data;
}

export async function createDriverProfile(
  userId: string,
  licenseNumber: string,
  vehicleType: 'bicycle' | 'motorcycle' | 'car' | 'scooter' = 'car',
  extra?: Partial<DeliveryDriver>
): Promise<DeliveryDriver | null> {
  const { data, error } = await supabase
    .from('delivery_drivers')
    .insert({
      user_id: userId,
      license_number: licenseNumber,
      vehicle_type: vehicleType,
      background_check_status: 'pending',
      documents_verified: false,
      is_online: false,
      is_available: false,
      ...extra
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating driver profile:', error);
    return null;
  }

  return data;
}

export async function updateDriverOnlineStatus(driverId: string, isOnline: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('delivery_drivers')
    .update({ 
      is_online: isOnline
    })
    .eq('id', driverId);

  if (error) {
    console.error('Error updating driver online status:', error);
    return false;
  }

  return true;
}

export async function updateDriverLocation(
  driverId: string, 
  latitude: number,
  longitude: number
): Promise<boolean> {
  const { error } = await supabase
    .from('delivery_drivers')
    .update({
      current_latitude: latitude,
      current_longitude: longitude,
      last_location_update: new Date().toISOString()
    })
    .eq('id', driverId);

  if (error) {
    console.error('Error updating driver location:', error);
    return false;
  }

  return true;
}

export async function getDriverById(driverId: string): Promise<DeliveryDriver | null> {
  const { data, error } = await supabase
    .from('delivery_drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  if (error) {
    console.error('Error fetching driver by id:', error);
    return null;
  }

  return data;
}

export async function uploadDriverDocument(
  driverId: string,
  fileUri: string,
  docType: 'id' | 'license'
): Promise<string | null> {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const fileExt = fileUri.split('.').pop() || 'jpg';
    const filePath = `${driverId}/${docType}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('driver-docs')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;
    if (!data?.path) return null;

    const { data: publicUrlData } = supabase.storage.from('driver-docs').getPublicUrl(data.path);
    return publicUrlData?.publicUrl || data.path;
  } catch (err) {
    console.error('Error uploading driver document:', err);
    return null;
  }
}

export async function updateDriverProfile(
  driverId: string,
  updates: Partial<Pick<DeliveryDriver,
    'license_number' |
    'vehicle_type' |
    'vehicle_make' |
    'vehicle_model' |
    'vehicle_year' |
    'vehicle_color' |
    'license_plate' |
    'id_document_url' |
    'license_document_url' |
    'payout_account'
  >>
): Promise<DeliveryDriver | null> {
  const { data, error } = await supabase
    .from('delivery_drivers')
    .update({
      ...updates,
      // Any profile change should re-trigger verification
      background_check_status: 'pending',
      documents_verified: false,
      is_online: false,
      is_available: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', driverId)
    .select()
    .single();

  if (error) {
    console.error('Error updating driver profile:', error);
    return null;
  }

  return data;
}
