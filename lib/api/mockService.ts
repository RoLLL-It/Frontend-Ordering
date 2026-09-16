import { mockDb } from '@/lib/mock/db';
import {
  AdminStats,
  CartValidateResponse,
  Category,
  CreateOrderInput,
  DeliverySlot,
  Location,
  MenuItem,
  MenuResponse,
  Order,
  Review,
  ReviewSummary,
  User,
} from '@/types/api';
import { ApiError } from './client';

export const mockService = {
  // Auth
  async login(identifier: string, password: string): Promise<{ user: User; access_token: string; expires_in: number }> {
    const cleanId = identifier.trim().toLowerCase();
    const user = mockDb.users.find(
      (u) => u.email.toLowerCase() === cleanId || u.phone === cleanId
    );

    if (!user) {
      // Intentionally generic error matching LLD §5.1
      throw new ApiError({ code: 'INVALID_CREDENTIALS', message: 'Email/phone or password is incorrect.' }, 401);
    }

    return {
      user,
      access_token: `mock_jwt_${user.id}_${Date.now()}`,
      expires_in: 900,
    };
  },

  async register(data: { name: string; email: string; phone: string; password: string }): Promise<{ user: User; access_token: string; expires_in: number }> {
    if (mockDb.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new ApiError({ code: 'EMAIL_TAKEN', message: 'This email is already registered.' }, 409);
    }
    if (mockDb.users.some((u) => u.phone === data.phone)) {
      throw new ApiError({ code: 'PHONE_TAKEN', message: 'This phone number is already registered.' }, 409);
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      role: 'CUSTOMER',
      is_active: true,
      orders_count: 0,
      created_at: new Date().toISOString(),
    };
    mockDb.users.push(newUser);

    return {
      user: newUser,
      access_token: `mock_jwt_${newUser.id}_${Date.now()}`,
      expires_in: 900,
    };
  },

  async getMe(userId?: string): Promise<User> {
    if (userId) {
      const user = mockDb.users.find((u) => u.id === userId);
      if (user) return user;
    }
    return mockDb.users[0]; // Default to Heet Chovatiya
  },

  // Menu
  async getMenu(): Promise<MenuResponse> {
    const populatedCategories: Category[] = mockDb.categories.map((cat) => ({
      ...cat,
      items: mockDb.menuItems.filter(
        (item) => item.category_id === cat.id && item.is_active
      ),
    }));

    return {
      categories: populatedCategories,
      delivery_enabled: mockDb.settings.delivery_enabled,
      kitchen_open: mockDb.settings.kitchen_open,
      announcement: mockDb.settings.announcement,
    };
  },

  // Locations & Slots
  async getLocations(): Promise<Location[]> {
    return mockDb.locations;
  },

  async getSlots(locationId: string, _date?: string): Promise<DeliverySlot[]> {
    return mockDb.slots.filter((s) => s.location_id === locationId);
  },

  // Cart Validation
  async validateCart(items: { menu_item_id: string; quantity: number }[], locationId?: string): Promise<CartValidateResponse> {
    const loc = mockDb.locations.find((l) => l.id === locationId);
    const delivery_fee_paise = loc ? loc.delivery_fee_paise : 0;

    const validatedItems = [];
    const unavailableItems: string[] = [];
    let subtotal_paise = 0;

    for (const item of items) {
      const found = mockDb.menuItems.find((mi) => mi.id === item.menu_item_id);
      if (!found) continue;

      const isAvailable = found.is_available && found.is_active;
      if (!isAvailable) {
        unavailableItems.push(found.name);
      }

      const lineTotal = found.price_paise * item.quantity;
      if (isAvailable) {
        subtotal_paise += lineTotal;
      }

      validatedItems.push({
        menu_item_id: found.id,
        name: found.name,
        price_paise: found.price_paise,
        quantity: item.quantity,
        line_total_paise: lineTotal,
        is_available: isAvailable,
      });
    }

    return {
      items: validatedItems,
      subtotal_paise,
      delivery_fee_paise,
      total_paise: subtotal_paise + delivery_fee_paise,
      unavailable_items: unavailableItems,
      delivery_enabled: mockDb.settings.delivery_enabled,
    };
  },

  // Orders
  async createOrder(input: CreateOrderInput, currentUser?: User): Promise<Order> {
    if (!mockDb.settings.delivery_enabled) {
      throw new ApiError({ code: 'DELIVERY_DISABLED', message: "Kitchen's delivery is currently closed." }, 409);
    }

    const loc = mockDb.locations.find((l) => l.id === input.location_id);
    if (!loc || !loc.delivery_enabled) {
      throw new ApiError({ code: 'DELIVERY_DISABLED', message: 'Delivery to this location is currently paused.' }, 409);
    }

    const slot = mockDb.slots.find((s) => s.id === input.slot_id);
    if (!slot || slot.booked_count >= slot.capacity) {
      throw new ApiError({ code: 'SLOT_FULL', message: 'That slot just filled up. Please pick another.' }, 409);
    }

    const unavailable: string[] = [];
    let subtotal = 0;
    const orderItems = input.items.map((i) => {
      const mi = mockDb.menuItems.find((m) => m.id === i.menu_item_id);
      if (!mi || !mi.is_available) {
        unavailable.push(mi?.name || 'Item');
      }
      const price = mi ? mi.price_paise : 0;
      const line = price * i.quantity;
      subtotal += line;
      return {
        id: `oi-${Date.now()}-${Math.random()}`,
        name_snapshot: mi ? mi.name : 'Unknown Item',
        quantity: i.quantity,
        price_snapshot_paise: price,
        line_total_paise: line,
      };
    });

    if (unavailable.length > 0) {
      throw new ApiError({
        code: 'ITEMS_UNAVAILABLE',
        message: 'Some items in your cart became sold out.',
        details: { items: unavailable },
      }, 409);
    }

    slot.booked_count += 1;
    slot.seats_left = Math.max(0, slot.capacity - slot.booked_count);
    if (slot.seats_left === 0) {
      slot.is_available = false;
      slot.unavailable_reason = 'FULL';
    }

    const codeNum = Math.floor(Math.random() * 90 + 10);
    const codeLetter = String.fromCharCode(65 + Math.floor(Math.random() * 8)); // A-H
    const shortCode = `RIT-${codeLetter}${codeNum}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      short_code: shortCode,
      user_id: currentUser?.id || 'usr-1',
      customer_name: currentUser?.name || 'Heet Chovatiya',
      status: 'PLACED',
      items: orderItems,
      subtotal_paise: subtotal,
      delivery_fee_paise: loc.delivery_fee_paise,
      total_paise: subtotal + loc.delivery_fee_paise,
      location: {
        id: loc.id,
        code: loc.code,
        name: loc.name,
      },
      slot: {
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_date: slot.slot_date,
      },
      payment_mode: input.payment_mode || 'COD',
      payment_status: 'PENDING',
      notes: input.notes || '',
      can_cancel: true,
      can_review: false,
      cancel_deadline_at: new Date(Date.now() + 1000 * 60 * 2).toISOString(), // 2 mins
      placed_at: new Date().toISOString(),
      timeline: [
        { status: 'PLACED', at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ],
    };

    mockDb.orders.unshift(newOrder);
    mockDb.adminStats.orders_today += 1;
    mockDb.adminStats.active_orders += 1;
    mockDb.adminStats.revenue_today_paise += newOrder.total_paise;

    return newOrder;
  },

  async getOrder(id: string): Promise<Order> {
    const order = mockDb.orders.find((o) => o.id === id || o.short_code === id);
    if (!order) {
      throw new ApiError({ code: 'NOT_FOUND', message: 'Order not found.' }, 404);
    }
    // Update can_cancel dynamically based on deadline
    if (order.cancel_deadline_at) {
      order.can_cancel =
        order.status === 'PLACED' &&
        new Date(order.cancel_deadline_at).getTime() > Date.now();
    }
    return order;
  },

  async getOrders(status?: string): Promise<Order[]> {
    if (status === 'active') {
      return mockDb.orders.filter(
        (o) =>
          o.status === 'PLACED' ||
          o.status === 'ACCEPTED' ||
          o.status === 'PREPARING' ||
          o.status === 'READY' ||
          o.status === 'OUT_FOR_DELIVERY'
      );
    }
    return mockDb.orders;
  },

  async cancelOrder(id: string): Promise<Order> {
    const order = mockDb.orders.find((o) => o.id === id);
    if (!order) {
      throw new ApiError({ code: 'NOT_FOUND', message: 'Order not found.' }, 404);
    }
    if (order.status !== 'PLACED') {
      throw new ApiError({ code: 'INVALID_TRANSITION', message: 'Order is already being prepared and cannot be cancelled.' }, 409);
    }
    if (new Date(order.cancel_deadline_at).getTime() < Date.now()) {
      throw new ApiError({ code: 'CANCEL_WINDOW_PASSED', message: 'The 2-minute cancellation window has passed.' }, 409);
    }

    order.status = 'CANCELLED_BY_USER';
    order.can_cancel = false;
    order.cancelled_at = new Date().toISOString();
    order.timeline.push({
      status: 'CANCELLED_BY_USER',
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    // Release slot
    const slot = mockDb.slots.find((s) => s.id === order.slot.id);
    if (slot && slot.booked_count > 0) {
      slot.booked_count -= 1;
      slot.seats_left = slot.capacity - slot.booked_count;
      if (slot.seats_left > 0 && slot.unavailable_reason === 'FULL') {
        slot.is_available = true;
        slot.unavailable_reason = null;
      }
    }

    return order;
  },

  // Reviews
  async getReviewsSummary(): Promise<ReviewSummary> {
    return {
      average: 4.6,
      total: mockDb.reviews.length + 54,
      distribution: {
        5: 38,
        4: 12,
        3: 5,
        2: 1,
        1: 1,
      },
    };
  },

  async getReviews(): Promise<Review[]> {
    return mockDb.reviews;
  },

  async createReview(data: { order_id: string; rating: number; comment?: string }, user?: User): Promise<Review> {
    const order = mockDb.orders.find((o) => o.id === data.order_id);
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      order_id: data.order_id,
      rating: data.rating,
      comment: data.comment || '',
      reviewer_name: user?.name ? `${user.name.split(' ')[0]} ${user.name.split(' ')[1]?.[0] || ''}.` : 'Heet C.',
      items: order ? order.items.map((i) => i.name_snapshot) : ['Roll-IT Special'],
      created_at: new Date().toISOString(),
      editable_until: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    };
    mockDb.reviews.unshift(newRev);
    if (order) {
      order.can_review = false;
    }
    return newRev;
  },

  // Admin
  async getAdminStats(): Promise<AdminStats> {
    return mockDb.adminStats;
  },

  async advanceOrderStatus(id: string, status: any): Promise<Order> {
    const order = mockDb.orders.find((o) => o.id === id);
    if (!order) throw new ApiError({ code: 'NOT_FOUND', message: 'Order not found' }, 404);

    order.status = status;
    order.timeline.push({
      status,
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    if (status === 'DELIVERED') {
      order.payment_status = 'PAID';
      order.delivered_at = new Date().toISOString();
      order.can_review = true;
    }

    return order;
  },

  async toggleItemAvailability(id: string): Promise<MenuItem> {
    const item = mockDb.menuItems.find((m) => m.id === id);
    if (!item) throw new ApiError({ code: 'NOT_FOUND', message: 'Item not found' }, 404);
    item.is_available = !item.is_available;
    return item;
  },

  async updateSettings(settings: Partial<typeof mockDb.settings>) {
    Object.assign(mockDb.settings, settings);
    return mockDb.settings;
  },

  async getUsers(): Promise<User[]> {
    return mockDb.users;
  },
};
