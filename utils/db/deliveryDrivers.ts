import { supabase } from '../supabase';
import { DeliveryDriver } from '@/types/database';

export async function getDriverByUserId(userId: string): Promise<DeliveryDriver | null> {
  const { data, error } = await supabase
    .from('delivery_drivers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

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
  const payload = {
    user_id: userId,
    license_number: licenseNumber,
    vehicle_type: vehicleType,
    name: (extra as any)?.name || (extra as any)?.user?.full_name || 'Driver',
    phone: (extra as any)?.phone || (extra as any)?.user?.phone || '',
    rating: 5,
    total_deliveries: 0,
    background_check_status: (extra as any)?.background_check_status || 'approved',
    documents_verified: (extra as any)?.documents_verified ?? false,
    is_online: false,
    is_available: false,
    ...(extra as any),
  } as any;

  const { data, error } = await supabase
    .from('delivery_drivers')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error creating driver profile:', error);
    return null;
  }

  return data;
}

export async function updateDriverOnlineStatus(driverId: string, isOnline: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!isOnline) {
    const { error } = await supabase
      .from('delivery_drivers')
      .update({ is_online: false })
      .eq('id', driverId);

    if (error) {
      console.error('Error updating driver online status:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  const driver = await getDriverById(driverId);
  if (!driver) return { ok: false, error: 'Driver not found' };

  if (!driver.documents_verified) {
    return { ok: false, error: 'Your documents are still under review.' };
  }

  if (!driver.payout_account) {
    return { ok: false, error: 'Add payout details before going online.' };
  }

  const { error } = await supabase
    .from('delivery_drivers')
    .update({ 
      is_online: true,
      is_available: true
    })
    .eq('id', driverId);

  if (error) {
    console.error('Error updating driver online status:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function updateDriverLocation(
  driverId: string, 
  latitude: number,
  longitude: number
): Promise<boolean> {
  if (!driverId) {
    console.warn('updateDriverLocation: missing driverId');
    return false;
  }

  const { data: session } = await supabase.auth.getSession();
  const authUserId = session?.session?.user?.id;

  let driver = await getDriverById(driverId);
  if (!driver) {
    // Fallback: look up by current user id in case we were passed a userId instead of driverId
    if (authUserId) {
      driver = await getDriverByUserId(authUserId);
    }
  }

  if (!driver) {
    console.error('Error updating driver location: driver not found', {
      driverId,
      authUserId: authUserId || 'none',
    });
    return false;
  }

  const docsApproved =
    driver.documents_verified === true &&
    driver.license_document_status === 'approved' &&
    !!driver.payout_account;

  // If docs/payout are not approved, force offline to avoid trigger failure but still store last location
  const payload: any = {
    current_latitude: latitude,
    current_longitude: longitude,
    last_location_update: new Date().toISOString(),
  };
  if (!docsApproved && driver.is_online) {
    payload.is_online = false;
  }

  const { error } = await supabase
    .from('delivery_drivers')
    .update(payload)
    .eq('id', driverId);

  if (error) {
    console.error('Error updating driver location:', {
      message: (error as any)?.message,
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      status: (error as any)?.status,
    });
    return false;
  }

  return true;
}

export async function getDriverById(driverId?: string): Promise<DeliveryDriver | null> {
  if (!driverId) {
    console.warn('getDriverById: missing driverId');
    return null;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(driverId);
  if (!isUuid) {
    console.warn('getDriverById: invalid id format, skipping driver lookup', { driverId });
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('delivery_drivers')
      .select('*')
      .eq('id', driverId)
      .maybeSingle();

    if (error) {
      // Supabase returns PGRST116/406 when no row is found and 401/403 when RLS blocks access.
      const isNoRow = (error as any)?.code === 'PGRST116' || (error as any)?.status === 406;
      const isNoAccess = (error as any)?.status === 403 || (error as any)?.status === 401 || (error as any)?.code === 'PGRST301';
      if (!isNoRow && !isNoAccess) {
        console.error('Error fetching driver by id:', { driverId, error });
      }
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching driver by id (unexpected):', { driverId, err });
    return null;
  }
}

export async function uploadDriverDocument(
  driverId: string,
  fileUri: string,
  docType: 'id' | 'license' | 'id_front' | 'id_back' | 'vehicle'
): Promise<string | null> {
  try {
    const { data: authUser } = await supabase.auth.getUser();
    const prefix = authUser?.user?.id || driverId;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const fileExt = fileUri.split('.').pop() || 'jpg';
    const filePath = `${prefix}/${docType}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('driver-docs')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;
    if (!data?.path) return null;

    const { data: publicUrlData } = supabase.storage.from('driver-docs').getPublicUrl(data.path);
    const publicUrl = publicUrlData?.publicUrl || data.path;

    const baseUpdate: Record<string, any> = {
      updated_at: new Date().toISOString(),
      documents_verified: false,
      doc_review_status: 'pending',
      doc_review_notes: null,
    };

    let docUpdate: Record<string, any>;
    switch (docType) {
      case 'license':
        docUpdate = {
          license_document_url: publicUrl,
          license_document_status: 'pending',
          license_verified_at: null,
        };
        break;
      case 'id_front':
        docUpdate = { id_front_url: publicUrl };
        break;
      case 'id_back':
        docUpdate = { id_back_url: publicUrl };
        break;
      case 'vehicle':
        docUpdate = { vehicle_document_url: publicUrl };
        break;
      default:
        docUpdate = { id_document_url: publicUrl };
    }

    await supabase.from('delivery_drivers').update({ ...baseUpdate, ...docUpdate }).eq('id', driverId);

    return publicUrl;
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
    'payout_account' |
    'current_latitude' |
    'current_longitude' |
    'last_location_update'
  >>
): Promise<DeliveryDriver | null> {
  const { data, error } = await supabase
    .from('delivery_drivers')
    .update({
      ...updates,
      // Any profile change should re-trigger doc verification, but background check is always treated as approved
      background_check_status: 'approved',
      documents_verified: false,
      license_document_status: 'pending',
      doc_review_status: 'pending',
      license_verified_at: null,
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
