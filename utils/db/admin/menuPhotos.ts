import { supabase } from '../../supabase';
import { logAudit } from '../trustedArrival';

export type MenuPhotoReview = {
  menu_item_id: string;
  restaurant_id: string;
  restaurant_name: string;
  name: string;
  image: string;
  photo_approval_status: string | null;
  photo_approval_notes: string | null;
  restaurant_has_payout?: boolean | null;
  updated_at: string;
};

export async function getMenuPhotoReviews(): Promise<MenuPhotoReview[]> {
  const { data, error } = await supabase.rpc('list_menu_photo_reviews');
  if (error) {
    console.warn('list_menu_photo_reviews error', error);
    return [];
  }
  return data || [];
}

export async function reviewMenuPhoto(menuItemId: string, decision: 'approved' | 'rejected', notes?: string): Promise<boolean> {
  const { error } = await supabase.rpc('review_menu_photo', {
    p_menu_item_id: menuItemId,
    p_decision: decision,
    p_notes: notes ?? null,
  });
  if (error) return false;
  await logAudit('menu_photo_review', 'menu_items', menuItemId, { decision, notes });
  return true;
}
