import { supabase } from '../../supabase';

export type AdminTotals = {
  total_customer_paid: number;
  total_platform_fee: number;
  paid_orders: number;
};

export type DriverProfit = {
  driver_id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  gross_driver_earnings: number;
  refunds: number;
  net_driver_profit: number;
};

export type RestaurantProfit = {
  restaurant_id: string;
  restaurant_name: string | null;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  gross_restaurant_net: number;
  refunds: number;
  net_restaurant_profit: number;
};

export async function getAdminTotals(params?: { start?: string; end?: string }): Promise<AdminTotals | null> {
  const { data, error } = await supabase.rpc('admin_totals', {
    p_start: params?.start ?? null,
    p_end: params?.end ?? null,
  });
  if (error) {
    console.warn('admin_totals error', error);
    return null;
  }
  const row = data?.[0];
  return row || null;
}

export async function getDriverProfit(params?: { start?: string; end?: string; driverUserId?: string | null }): Promise<DriverProfit[]> {
  const { data, error } = await supabase.rpc('admin_driver_profit', {
    p_start: params?.start ?? null,
    p_end: params?.end ?? null,
    p_driver_user_id: params?.driverUserId ?? null,
  });
  if (error) {
    console.warn('admin_driver_profit error', error);
    return [];
  }
  return data || [];
}

export async function getRestaurantProfit(params?: { start?: string; end?: string; restaurantId?: string | null }): Promise<RestaurantProfit[]> {
  const { data, error } = await supabase.rpc('admin_restaurant_profit', {
    p_start: params?.start ?? null,
    p_end: params?.end ?? null,
    p_restaurant_id: params?.restaurantId ?? null,
  });
  if (error) {
    console.warn('admin_restaurant_profit error', error);
    return [];
  }
  return data || [];
}
