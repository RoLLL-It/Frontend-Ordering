import { apiFetch } from './client';
import { mockService } from './mockService';
import {
  CartItemInput,
  CartValidateResponse,
  CreateOrderInput,
  Order,
} from '@/types/api';

export const ordersApi = {
  async validateCart(
    items: CartItemInput[],
    locationId?: string
  ): Promise<CartValidateResponse> {
    try {
      return await apiFetch<CartValidateResponse>('/cart/validate', {
        method: 'POST',
        body: JSON.stringify({ items, location_id: locationId }),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.validateCart(items, locationId);
      }
      throw err;
    }
  },

  async createOrder(input: CreateOrderInput): Promise<Order> {
    try {
      return await apiFetch<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.createOrder(input);
      }
      throw err;
    }
  },

  async getOrder(id: string): Promise<Order> {
    try {
      return await apiFetch<Order>(`/orders/${id}`);
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.getOrder(id);
      }
      throw err;
    }
  },

  async getOrders(status?: string): Promise<Order[]> {
    try {
      const q = status ? `?status=${status}` : '';
      return await apiFetch<Order[]>(`/orders${q}`);
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.getOrders(status);
      }
      throw err;
    }
  },

  async cancelOrder(id: string): Promise<Order> {
    try {
      return await apiFetch<Order>(`/orders/${id}/cancel`, {
        method: 'POST',
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.cancelOrder(id);
      }
      throw err;
    }
  },
};

