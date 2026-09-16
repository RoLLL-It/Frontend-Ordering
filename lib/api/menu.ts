import { apiFetch } from './client';
import { mockService } from './mockService';
import { MenuItem, MenuResponse } from '@/types/api';

export const menuApi = {
  async getMenu(): Promise<MenuResponse> {
    try {
      return await apiFetch<MenuResponse>('/menu', { skipAuth: true });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.getMenu();
      }
      throw err;
    }
  },

  async getItem(id: string): Promise<MenuItem> {
    try {
      return await apiFetch<MenuItem>(`/menu/items/${id}`, { skipAuth: true });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        const menu = await mockService.getMenu();
        for (const cat of menu.categories) {
          const found = cat.items.find((i) => i.id === id);
          if (found) return found;
        }
      }
      throw err;
    }
  },
};

