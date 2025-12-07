export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  user_type: 'customer' | 'restaurant' | 'delivery' | 'admin';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  restaurant_id?: string | null;
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
  delivery_radius_km?: number;
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
  sku?: string | null;
  external_id?: string | null;
  calories?: number;
  allergens?: string[];
  ingredients?: string[];
  sort_order: number;
  photo_approval_status?: 'pending' | 'approved' | 'rejected';
  photo_approval_notes?: string | null;
  photo_reviewed_at?: string | null;
  photo_reviewer?: string | null;
  available_start_time?: string | null;
  available_end_time?: string | null;
  variants?: MenuItemOption[];
  addons?: MenuItemOption[];
  created_at: string;
  updated_at: string;
  restaurant?: Restaurant;
  category_info?: Category;
}

export interface MenuItemOption {
  name: string;
  price: number;
  available?: boolean;
}

export interface BackupMapping {
  id: string;
  source_restaurant_id: string;
  source_item_id: string;
  target_restaurant_id: string;
  target_item_id: string;
  is_active: boolean;
  created_at: string;
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
  platform_fee?: number | null;
  restaurant_net?: number | null;
  total_charged?: number | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
  payment_status:
    | 'payment_pending'
    | 'paid_pending_review'
    | 'paid'
    | 'initiated'
    | 'hold'
    | 'captured'
    | 'refunded'
    | 'failed'
    | 'voided';
  payment_method: string;
  customer_payment_txn_id?: string | null;
  delivery_address: string;
  delivery_instructions?: string;
  estimated_delivery_time?: string;
  receipt_url?: string;
  wallet_capture_status?: 'pending' | 'held' | 'released' | 'refunded' | 'failed';
  chargeback_flag?: boolean;
  restaurant_payout_status?: 'pending' | 'initiated' | 'paid' | 'failed';
  restaurant_payout_ref?: string | null;
  restaurant_payout_attempts?: number | null;
  restaurant_payout_last_error?: string | null;
  restaurant_payout_next_retry_at?: string | null;
  driver_payout_status?: 'pending' | 'initiated' | 'paid' | 'failed';
  driver_payout_ref?: string | null;
  driver_payout_attempts?: number | null;
  driver_payout_last_error?: string | null;
  driver_payout_next_retry_at?: string | null;
  delivery_fee_paid_at?: string | null;
  payment_proof_attempts?: number | null;
  payment_proof_last_attempt?: string | null;
  payment_reported_amount?: number | null;
  payment_auto_verified?: boolean | null;
  payment_txn_duplicate?: boolean | null;
  payment_review_notes?: string | null;
  payment_hold_reason?: string | null;
  commission_amount?: number;
  eta_promised?: string;
  eta_confidence_low?: string;
  eta_confidence_high?: string;
  rerouted_from_order_id?: string;
  reroute_status?: 'pending' | 'approved' | 'performed' | 'failed';
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
  id_document_url?: string | null;
  id_front_url?: string | null;
  id_back_url?: string | null;
  vehicle_document_url?: string | null;
  license_document_url?: string | null;
  license_document_status?: 'pending' | 'approved' | 'rejected';
  doc_review_status?: 'pending' | 'approved' | 'rejected';
  doc_review_notes?: string | null;
  doc_reviewed_at?: string | null;
  license_verified_at?: string | null;
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
  status: 'available' | 'assigned' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
  assigned_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  delivery_notes?: string;
  payout_status?: 'pending' | 'paid' | 'failed';
  payout_at?: string;
  driver_payout_handle?: string | null;
  driver_payout_status?: 'pending' | 'initiated' | 'paid' | 'failed' | null;
  driver_payout_ref?: string | null;
  cancellation_reason_code?: string;
  issue_count?: number;
  created_at: string;
  updated_at: string;
  order?: Order;
  driver?: DeliveryDriver;
  issues?: DeliveryIssue[];
  feedback?: DeliveryFeedback[];
}

export interface DeliveryIssue {
  id: string;
  delivery_id?: string;
  order_id?: string;
  driver_id?: string;
  user_id?: string;
  reason_code: string;
  details?: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at?: string;
  metadata?: Record<string, any>;
}

export interface DeliveryFeedback {
  id: string;
  order_id: string;
  delivery_id: string;
  driver_id?: string;
  user_id?: string;
  rating?: number;
  tags?: string[];
  comment?: string;
  created_at: string;
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

export interface RestaurantDashboard {
  summary: {
    sales?: number;
    orders?: number;
    customers?: number;
    menu_items?: number;
    sales_pct_change?: number;
    orders_pct_change?: number;
    aov?: number;
    customers_pct_change?: number;
    aov_pct_change?: number;
  };
  hourly: {
    hour: string;
    sales: number;
    orders: number;
    customers: number;
  }[];
}

export interface TrustedArrival {
  customer_id: string;
  visits: number;
  last_visit: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  pending_balance?: number;
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
  type: 'deposit' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'commission' | 'driver_payout' | 'psp_hold' | 'psp_capture' | 'refund' | 'payout_request';
  status: 'pending' | 'completed' | 'failed' | 'on_hold' | 'reversed' | 'processing' | 'review';
  reference?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PayoutMethod {
  id: string;
  user_id: string;
  type: string;
  bank_name?: string;
  last4?: string;
  is_default?: boolean;
  metadata?: Record<string, any>;
  created_at: string;
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
  approvedImagesOnly?: boolean;
  includeUnapproved?: boolean;
}

export interface OrderFilters {
  status?: string[];
  dateRange?: [string, string];
  restaurant?: string;
  minTotal?: number;
  maxTotal?: number;
}

// Trusted arrival + reliability
export interface RestaurantSla {
  restaurant_id: string;
  prep_p50_minutes: number;
  prep_p90_minutes: number;
  reliability_score: number;
  buffer_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface ItemSubstitution {
  id: string;
  restaurant_id: string;
  item_id: string;
  substitute_item_id: string;
  rule_type: string;
  max_delta_pct?: number;
  auto_apply: boolean;
  notes?: string;
  created_at: string;
}

export interface BackupRestaurant {
  id: string;
  restaurant_id: string;
  backup_restaurant_id: string;
  priority: number;
  max_distance_km?: number;
  cuisine_match?: boolean;
  is_active: boolean;
  created_at: string;
  backup_restaurant?: Restaurant;
}

export interface DeliveryEvent {
  id: number;
  order_id: string;
  driver_id?: string;
  event_type: string;
  payload?: Record<string, any>;
  created_at: string;
}

export interface DriverCashReconciliation {
  id: string;
  driver_id: string;
  cash_on_hand: number;
  pending_reconciliation: number;
  status: 'pending' | 'settled' | 'discrepancy';
  note?: string | null;
  created_at: string;
  settled_at?: string | null;
}

export interface DriverCashTransaction {
  id: string;
  driver_id: string;
  reconciliation_id?: string | null;
  amount: number;
  currency?: string;
  type: 'collection' | 'payout' | 'adjustment';
  reference?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DriverCashDiscrepancy {
  id: string;
  reconciliation_id: string;
  driver_id: string;
  amount: number;
  reason?: string | null;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at?: string | null;
}

export interface PayoutAttempt {
  id: string;
  request_id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  confirmation_number?: string | null;
  eta_text?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}
