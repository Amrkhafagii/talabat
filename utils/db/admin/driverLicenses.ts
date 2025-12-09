import { supabase } from '../../supabase';
import { logAudit } from '../trustedArrival';

export type DriverLicenseReview = {
  driver_id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  license_document_url: string | null;
  license_document_status: string | null;
  vehicle_type: string | null;
  id_front_url?: string | null;
  id_back_url?: string | null;
  vehicle_document_url?: string | null;
  doc_review_status?: string | null;
  doc_review_notes?: string | null;
  payout_account_present?: boolean | null;
  updated_at: string;
};

export async function getDriverLicenseReviews(): Promise<DriverLicenseReview[]> {
  const { data, error } = await supabase.rpc('list_driver_license_reviews');
  if (error) {
    console.warn('list_driver_license_reviews error', error);
    return [];
  }
  return data || [];
}

export async function reviewDriverLicense(driverId: string, decision: 'approved' | 'rejected', notes?: string): Promise<boolean> {
  const { error } = await supabase.rpc('review_driver_license', {
    p_driver_id: driverId,
    p_decision: decision,
    p_notes: notes ?? null,
  });
  if (error) return false;
  await logAudit('driver_license_review', 'delivery_drivers', driverId, { decision, notes });
  return true;
}
