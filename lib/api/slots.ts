import { apiFetch } from './client';
import { mockService } from './mockService';
import { DeliverySlot, Location } from '@/types/api';

export const slotsApi = {
  async getLocations(): Promise<Location[]> {
    try {
      return await apiFetch<Location[]>('/locations', { skipAuth: true });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.getLocations();
      }
      throw err;
    }
  },

  async getSlots(locationId: string, date?: string): Promise<DeliverySlot[]> {
    try {
      const q = new URLSearchParams({ location_id: locationId });
      if (date) q.append('date', date);
      return await apiFetch<DeliverySlot[]>(`/slots?${q.toString()}`);
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.getSlots(locationId, date);
      }
      throw err;
    }
  },
};

