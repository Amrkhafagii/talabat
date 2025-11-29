export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  user_type: 'customer' | 'restaurant' | 'delivery';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  cuisine: string;
  rating: number;
  delivery_time: string;
  delivery_fee: number;
  minimum_order: number;
  image: string;
  cover_image?: string;
  address: string;
  phone?: string;
  email?: string;
  is_promoted: boolean;
  is_active: boolean;
  is_open: boolean;
  total_reviews: number;
  created_at: string;
  updated_at: string;
  restaurant_hours?: RestaurantHours[];
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  kyc_status?: string;
  payout_account?: Record<string, any>;
}

interface RestaurantHours {
  id: string;
  restaurant_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  open_time?: string;
  close_time?: string;
  is_closed: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string; // For backward compatibility
  is_popular: boolean;
  is_available: boolean;
  preparation_time: number;
  calories?: number;
  allergens?: string[];
  ingredients?: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  restaurant?: Restaurant;
  category_info?: Category;
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  delivery_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  restaurant_id: string;
  delivery_address_id?: string;
  subtotal: number;
  delivery_fee: number;
  tax_amount: number;
  tip_amount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
  payment_status: 'initiated' | 'hold' | 'captured' | 'refunded' | 'failed' | 'voided';
  payment_method: string;
  delivery_address: string;
  delivery_instructions?: string;
  estimated_delivery_time?: string;
  receipt_url?: string;
  wallet_capture_status?: 'pending' | 'held' | 'released' | 'refunded' | 'failed';
  commission_amount?: number;
  confirmed_at?: string;
  prepared_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  restaurant?: Restaurant;
  order_items?: OrderItem[];
  delivery?: Delivery;
  user?: User;
  delivery_address_info?: UserAddress;
}

interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string;
  created_at: string;
  menu_item?: MenuItem;
}

export interface DeliveryDriver {
  id: string;
  user_id: string;
  license_number: string;
  vehicle_type: 'bicycle' | 'motorcycle' | 'car' | 'scooter';
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  license_plate?: string;
  is_online: boolean;
  is_available: boolean;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  rating: number;
  total_deliveries: number;
  total_earnings: number;
  background_check_status: 'pending' | 'approved' | 'rejected';
  documents_verified: boolean;
  id_document_url?: string;
  license_document_url?: string;
  payout_account?: Record<string, any>;
  verification_notes?: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Delivery {
  id: string;
  order_id: string;
  driver_id?: string;
  pickup_address: string;
  delivery_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  distance_km?: number;
  estimated_duration_minutes?: number;
  delivery_fee: number;
  driver_earnings: number;
  status: 'pending' | 'assigned' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
  assigned_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  delivery_notes?: string;
  payout_status?: 'pending' | 'paid' | 'failed';
  payout_at?: string;
  created_at: string;
  updated_at: string;
  order?: Order;
  driver?: DeliveryDriver;
}

export interface Review {
  id: string;
  order_id: string;
  user_id: string;
  restaurant_id: string;
  driver_id?: string;
  restaurant_rating?: number;
  driver_rating?: number;
  food_quality_rating?: number;
  delivery_rating?: number;
  restaurant_comment?: string;
  driver_comment?: string;
  is_anonymous: boolean;
  created_at: string;
  user?: User;
  restaurant?: Restaurant;
  driver?: DeliveryDriver;
  order?: Order;
}

// Analytics and Stats Types
export interface RestaurantStats {
  todayRevenue: number;
  todayOrders: number;
  avgOrderValue: number;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  popularItems: MenuItem[];
  recentOrders: Order[];
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  type: 'customer' | 'restaurant' | 'driver';
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  order_id?: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'commission' | 'driver_payout' | 'psp_hold' | 'psp_capture' | 'refund';
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DeliveryStats {
  todayEarnings: number;
  completedDeliveries: number;
  avgDeliveryTime: number;
  rating: number;
  totalEarnings: number;
  totalDeliveries: number;
  onlineHours: number;
}

interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  favoriteRestaurants: Restaurant[];
  recentOrders: Order[];
  savedAddresses: UserAddress[];
}

// API Response Types
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Search and Filter Types
export interface RestaurantFilters {
  cuisine?: string[];
  rating?: number;
  deliveryFee?: number;
  deliveryTime?: number;
  promoted?: boolean;
  search?: string;
}

export interface MenuItemFilters {
  category?: string;
  popular?: boolean;
  available?: boolean;
  priceRange?: [number, number];
  search?: string;
}

export interface OrderFilters {
  status?: string[];
  dateRange?: [string, string];
  restaurant?: string;
  minTotal?: number;
  maxTotal?: number;
}
