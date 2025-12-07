import { supabase } from '../supabase';

export type KycStatus = {
  submission?: any;
  steps?: any[];
  documents?: any[];
};

export async function getKycStatus(restaurantId: string): Promise<KycStatus | null> {
  const { data, error } = await supabase.rpc('get_kyc_status', { p_restaurant_id: restaurantId });
  if (error) {
    console.error('Error fetching KYC status', error);
    return null;
  }
  return data as KycStatus;
}

export async function upsertKycSubmission(payload: Record<string, any>): Promise<boolean> {
  const { error } = await supabase.from('kyc_submissions').upsert(payload);
  if (error) {
    console.error('Error upserting KYC submission', error);
    return false;
  }
  return true;
}

export async function uploadKycDocument(doc: { submission_id: string; doc_type: string; doc_url: string }): Promise<boolean> {
  const { error } = await supabase.from('kyc_documents').insert(doc);
  if (error) {
    console.error('Error uploading KYC document', error);
    return false;
  }
  return true;
}
