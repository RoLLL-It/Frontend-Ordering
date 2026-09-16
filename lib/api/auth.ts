import { apiFetch, setAccessToken } from './client';
import { mockService } from './mockService';
import { User } from '@/types/api';

export const authApi = {
  async login(identifier: string, password: string): Promise<{ user: User; access_token: string }> {
    try {
      const data = await apiFetch<{ user: User; access_token: string; expires_in: number }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
          skipAuth: true,
        }
      );
      setAccessToken(data.access_token);
      return data;
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        const mockData = await mockService.login(identifier, password);
        setAccessToken(mockData.access_token);
        return mockData;
      }
      throw err;
    }
  },

  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ user: User; access_token: string }> {
    try {
      const res = await apiFetch<{ user: User; access_token: string; expires_in: number }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(data),
          skipAuth: true,
        }
      );
      setAccessToken(res.access_token);
      return res;
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        const mockData = await mockService.register(data);
        setAccessToken(mockData.access_token);
        return mockData;
      }
      throw err;
    }
  },

  async getMe(): Promise<User> {
    try {
      return await apiFetch<User>('/auth/me');
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        return await mockService.getMe();
      }
      throw err;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Always clear local token even on error
    } finally {
      setAccessToken(null);
    }
  },
};

