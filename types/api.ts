export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
  orders_count?: number;
}

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED_BY_USER'
  | 'CANCELLED_BY_ADMIN';

export type PaymentMode = 'COD' | 'ONLINE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_paise: number;
  image_url?: string;
  is_veg: boolean;
  is_available: boolean;
  is_active: boolean;
  rating_avg: number;
  rating_count: number;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  items: MenuItem[];
}

export interface MenuResponse {
  categories: Category[];
  delivery_enabled: boolean;
  kitchen_open: boolean;
  announcement: string;
}

export interface Location {
  id: string;
  code: string; // 'LJ' | 'TTECH' | 'STRATA'
  name: string;
  delivery_enabled: boolean;
  delivery_fee_paise: number;
  sort_order: number;
}

export type SlotUnavailableReason =
  | 'FULL'
  | 'CUTOFF_PASSED'
  | 'DELIVERY_DISABLED'
  | null;

export interface DeliverySlot {
  id: string;
  location_id: string;
  slot_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  capacity: number;
  booked_count: number;
  seats_left: number;
  is_available: boolean;
  unavailable_reason: SlotUnavailableReason;
}

export interface CartItemInput {
  menu_item_id: string;
  quantity: number;
}

export interface CartValidatedItem {
  menu_item_id: string;
  name: string;
  price_paise: number;
  quantity: number;
  line_total_paise: number;
  is_available: boolean;
}

export interface CartValidateResponse {
  items: CartValidatedItem[];
  subtotal_paise: number;
  delivery_fee_paise: number;
  total_paise: number;
  unavailable_items: string[];
  delivery_enabled: boolean;
}

export interface OrderItemSnapshot {
  id?: string;
  name: string;
  quantity: number;
  price_snapshot_paise: number;
  line_total_paise: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  short_code: string; // e.g. RIT-A47
  user_id?: string;
  customer_name?: string;
  status: OrderStatus;
  items: OrderItemSnapshot[];
  subtotal_paise: number;
  delivery_fee_paise: number;
  total_paise: number;
  location: {
    id?: string;
    code: string;
    name: string;
  };
  slot: {
    id?: string;
    start_time: string;
    end_time: string;
    slot_date?: string;
  };
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  notes?: string;
  can_cancel: boolean;
  can_review: boolean;
  cancel_deadline_at: string;
  cancel_reason?: string;
  placed_at: string;
  delivered_at?: string;
  cancelled_at?: string;
  timeline: OrderTimelineEvent[];
}

export interface CreateOrderInput {
  items: CartItemInput[];
  location_id: string;
  slot_id: string;
  notes?: string;
  payment_mode?: PaymentMode;
}

export interface Review {
  id: string;
  order_id: string;
  rating: number;
  comment: string;
  reviewer_name: string; // "Heet C."
  items: string[];
  created_at: string;
  editable_until?: string;
}

export interface ReviewSummary {
  average: number;
  total: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface AdminStats {
  orders_today: number;
  revenue_today_paise: number;
  active_orders: number;
  avg_rating: number;
  top_items: { name: string; count: number }[];
  orders_by_status: Record<string, number>;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  request_id?: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

