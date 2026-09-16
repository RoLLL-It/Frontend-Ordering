import { apiFetch } from './client';
import { mockService } from './mockService';
import { mockDb } from '@/lib/mock/db';
import {
  AdminStats,
  DeliverySlot,
  MenuItem,
  Order,
  OrderStatus,
  User,
} from '@/types/api';

export const adminApi = {
  async getStats(): Promise<AdminStats> {
    try {
      return await apiFetch<AdminStats>('/admin/stats');
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.getAdminStats();
      }
      throw err;
    }
  },

  async getOrders(params?: {
    status?: string;
    date?: string;
    location_id?: string;
  }): Promise<Order[]> {
    try {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.date) q.append('date', params.date);
      if (params?.location_id) q.append('location_id', params.location_id);
      return await apiFetch<Order[]>(`/admin/orders?${q.toString()}`);
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        let orders = mockDb.orders;
        if (params?.status) {
          orders = orders.filter((o) => o.status === params.status);
        }
        return orders;
      }
      throw err;
    }
  },

  async advanceOrderStatus(
    id: string,
    status: OrderStatus,
    note?: string
  ): Promise<Order> {
    try {
      return await apiFetch<Order>(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note: note || '' }),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.advanceOrderStatus(id, status);
      }
      throw err;
    }
  },

  async cancelOrder(id: string, reason: string): Promise<Order> {
    try {
      return await apiFetch<Order>(`/admin/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        const order = mockDb.orders.find((o) => o.id === id);
        if (order) {
          order.status = 'CANCELLED_BY_ADMIN';
          order.cancel_reason = reason;
          order.timeline.push({
            status: 'CANCELLED_BY_ADMIN',
            at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            note: reason,
          });
          return order;
        }
      }
      throw err;
    }
  },

  async getMenuItems(): Promise<MenuItem[]> {
    try {
      return await apiFetch<MenuItem[]>('/admin/menu/items');
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return mockDb.menuItems;
      }
      throw err;
    }
  },

  async toggleAvailability(id: string): Promise<MenuItem> {
    try {
      return await apiFetch<MenuItem>(`/admin/menu/items/${id}/availability`, {
        method: 'PATCH',
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.toggleItemAvailability(id);
      }
      throw err;
    }
  },

  async updateItem(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
    try {
      return await apiFetch<MenuItem>(`/admin/menu/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        const item = mockDb.menuItems.find((m) => m.id === id);
        if (item) Object.assign(item, data);
        return item!;
      }
      throw err;
    }
  },

  async createItem(data: {
    category_id: string;
    name: string;
    description: string;
    price_paise: number;
    is_veg: boolean;
  }): Promise<MenuItem> {
    try {
      return await apiFetch<MenuItem>('/admin/menu/items', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        const newItem: MenuItem = {
          id: `item-${Date.now()}`,
          category_id: data.category_id,
          name: data.name,
          description: data.description,
          price_paise: data.price_paise,
          image_url: '/logo.png',
          is_veg: data.is_veg,
          is_available: true,
          is_active: true,
          rating_avg: 5.0,
          rating_count: 0,
          sort_order: mockDb.menuItems.length + 1,
        };
        mockDb.menuItems.push(newItem);
        return newItem;
      }
      throw err;
    }
  },

  async softDeleteItem(id: string): Promise<void> {
    try {
      await apiFetch(`/admin/menu/items/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        const item = mockDb.menuItems.find((m) => m.id === id);
        if (item) item.is_active = false;
        return;
      }
      throw err;
    }
  },

  async updateSettings(settings: {
    delivery_enabled?: boolean;
    kitchen_open?: boolean;
    announcement?: string;
  }) {
    try {
      return await apiFetch('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.updateSettings(settings);
      }
      throw err;
    }
  },

  async getSlots(): Promise<DeliverySlot[]> {
    try {
      return await apiFetch<DeliverySlot[]>('/admin/slots');
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return mockDb.slots;
      }
      throw err;
    }
  },

  async updateSlotCapacity(id: string, capacity: number): Promise<DeliverySlot> {
    try {
      return await apiFetch<DeliverySlot>(`/admin/slots/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ capacity }),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        const slot = mockDb.slots.find((s) => s.id === id);
        if (slot) {
          slot.capacity = capacity;
          slot.seats_left = Math.max(0, capacity - slot.booked_count);
        }
        return slot!;
      }
      throw err;
    }
  },

  async getUsers(search?: string, role?: string): Promise<User[]> {
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (role) q.append('role', role);
      return await apiFetch<User[]>(`/admin/users?${q.toString()}`);
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        let users = await mockService.getUsers();
        if (search) {
          const s = search.toLowerCase();
          users = users.filter(
            (u) =>
              u.name.toLowerCase().includes(s) ||
              u.email.toLowerCase().includes(s) ||
              u.phone.includes(s)
          );
        }
        if (role) {
          users = users.filter((u) => u.role === role);
        }
        return users;
      }
      throw err;
    }
  },

  async updateUserRole(id: string, role: string): Promise<User> {
    try {
      return await apiFetch<User>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        const user = mockDb.users.find((u) => u.id === id);
        if (user) user.role = role as any;
        return user!;
      }
      throw err;
    }
  },
};
