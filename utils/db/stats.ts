import { supabase } from '../supabase';
import { RestaurantStats, DeliveryStats } from '@/types/database';

export async function getRestaurantStats(restaurantId: string): Promise<RestaurantStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Get today's orders
  const { data: todayOrders, error: ordersError } = await supabase
    .from('orders')
    .select('total, status')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', todayISO);

  // Get restaurant info
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('rating, total_reviews')
    .eq('id', restaurantId)
    .single();

  // Get popular menu items
  const { data: popularItems, error: itemsError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_popular', true)
    .limit(5);

  // Get recent orders
  const { data: recentOrders, error: recentError } = await supabase
    .from('orders')
    .select(`
      *,
      user:users(*),
      order_items(
        *,
        menu_item:menu_items(*)
      )
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (ordersError || restaurantError) {
    console.error('Error fetching restaurant stats:', ordersError || restaurantError);
    return { 
      todayRevenue: 0, 
      todayOrders: 0, 
      avgOrderValue: 0, 
      rating: 0,
      totalOrders: 0,
      totalRevenue: 0,
      popularItems: [],
      recentOrders: []
    };
  }

  const revenue = todayOrders?.reduce((sum, order) => sum + order.total, 0) || 0;
  const orderCount = todayOrders?.length || 0;
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

  return {
    todayRevenue: revenue,
    todayOrders: orderCount,
    avgOrderValue,
    rating: restaurant?.rating || 0,
    totalOrders: restaurant?.total_reviews || 0,
    totalRevenue: 0, // This would need a separate query for all-time revenue
    popularItems: popularItems || [],
    recentOrders: recentOrders || []
  };
}

export async function getDriverStats(driverId: string): Promise<DeliveryStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Get today's completed deliveries
  const { data: todayDeliveries, error: deliveriesError } = await supabase
    .from('deliveries')
    .select('driver_earnings, delivered_at, picked_up_at')
    .eq('driver_id', driverId)
    .eq('status', 'delivered')
    .gte('delivered_at', todayISO);

  // Get driver info
  const { data: driver, error: driverError } = await supabase
    .from('delivery_drivers')
    .select('rating, total_deliveries, total_earnings')
    .eq('id', driverId)
    .single();

  if (deliveriesError || driverError) {
    console.error('Error fetching driver stats:', deliveriesError || driverError);
    return { 
      todayEarnings: 0, 
      completedDeliveries: 0, 
      avgDeliveryTime: 0, 
      rating: 0,
      totalEarnings: 0,
      totalDeliveries: 0,
      onlineHours: 0
    };
  }

  const earnings = todayDeliveries?.reduce((sum, delivery) => sum + delivery.driver_earnings, 0) || 0;
  const deliveryCount = todayDeliveries?.length || 0;

  // Calculate average delivery time
  let avgDeliveryTime = 0;
  if (todayDeliveries && todayDeliveries.length > 0) {
    const totalTime = todayDeliveries.reduce((sum, delivery) => {
      if (delivery.picked_up_at && delivery.delivered_at) {
        const pickupTime = new Date(delivery.picked_up_at).getTime();
        const deliveryTime = new Date(delivery.delivered_at).getTime();
        return sum + (deliveryTime - pickupTime);
      }
      return sum;
    }, 0);
    avgDeliveryTime = Math.round(totalTime / (deliveryCount * 60000)); // Convert to minutes
  }

  return {
    todayEarnings: earnings,
    completedDeliveries: deliveryCount,
    avgDeliveryTime,
    rating: driver?.rating || 0,
    totalEarnings: driver?.total_earnings || 0,
    totalDeliveries: driver?.total_deliveries || 0,
    onlineHours: 8 // This would need tracking of online/offline times
  };
}

export async function getDriverEarningsStats(driverId: string): Promise<{
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalEarnings: number;
  avgEarningsPerDelivery: number;
  totalDeliveries: number;
  totalHours: number;
  avgRating: number;
  totalCommission: number;
}> {
  const now = new Date();
  
  // Calculate date ranges
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get all completed deliveries
  const { data: allDeliveries, error: deliveriesError } = await supabase
    .from('deliveries')
    .select('driver_earnings, delivered_at, picked_up_at, assigned_at, order:orders(total)')
    .eq('driver_id', driverId)
    .eq('status', 'delivered')
    .order('delivered_at', { ascending: false });

  // Get driver info
  const { data: driver, error: driverError } = await supabase
    .from('delivery_drivers')
    .select('rating, total_deliveries, total_earnings')
    .eq('id', driverId)
    .single();

  if (deliveriesError || driverError) {
    console.error('Error fetching driver earnings stats:', deliveriesError || driverError);
    return {
      todayEarnings: 0,
      weekEarnings: 0,
      monthEarnings: 0,
      totalEarnings: 0,
    avgEarningsPerDelivery: 0,
    totalDeliveries: 0,
    totalHours: 0,
    avgRating: 0,
    totalCommission: 0
  };
  }

  const deliveries = allDeliveries || [];

  // Calculate earnings by period
  const todayEarnings = deliveries
    .filter(d => new Date(d.delivered_at) >= today)
    .reduce((sum, d) => sum + d.driver_earnings, 0);

  const weekEarnings = deliveries
    .filter(d => new Date(d.delivered_at) >= weekStart)
    .reduce((sum, d) => sum + d.driver_earnings, 0);

  const monthEarnings = deliveries
    .filter(d => new Date(d.delivered_at) >= monthStart)
    .reduce((sum, d) => sum + d.driver_earnings, 0);

  const totalEarnings = deliveries.reduce((sum, d) => sum + d.driver_earnings, 0);
  const totalCommission = deliveries.reduce((sum, d) => {
    const total = (d as any).order?.total || 0;
    const commission = Math.max(total * 0.1, 30);
    return sum + commission;
  }, 0);
  const totalDeliveries = deliveries.length;
  const avgEarningsPerDelivery = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

  // Calculate total hours (rough estimate based on delivery times)
  const totalHours = deliveries.reduce((sum, delivery) => {
    if (delivery.assigned_at && delivery.delivered_at) {
      const assignedTime = new Date(delivery.assigned_at).getTime();
      const deliveredTime = new Date(delivery.delivered_at).getTime();
      return sum + (deliveredTime - assignedTime) / (1000 * 60 * 60); // Convert to hours
    }
    return sum;
  }, 0);

  return {
    todayEarnings,
    weekEarnings,
    monthEarnings,
    totalEarnings,
    avgEarningsPerDelivery,
    totalDeliveries,
    totalHours: Math.round(totalHours),
    avgRating: driver?.rating || 0,
    totalCommission
  };
}
