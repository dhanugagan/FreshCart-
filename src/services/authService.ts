import { apiClient, setAccessToken } from './api';
import type { NotificationItem, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<{ accessToken: string; user: User }> {
    const { data } = await apiClient.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    return data;
  },

  async register(payload: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    address?: string;
  }): Promise<{ accessToken: string; user: User }> {
    const { data } = await apiClient.post('/auth/register', payload);
    setAccessToken(data.accessToken);
    return data;
  },

  async refresh(): Promise<{ accessToken: string; user: User } | null> {
    try {
      const { data } = await apiClient.post('/auth/refresh');
      setAccessToken(data.accessToken);
      return data;
    } catch {
      setAccessToken(null);
      return null;
    }
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get('/auth/me');
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  async forgotPassword(email: string): Promise<{ message: string; resetTokenPreview?: string }> {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await apiClient.post('/auth/reset-password', { token, newPassword });
    return data;
  },

  async demoLogin(): Promise<{ accessToken: string; user: User }> {
    const { data } = await apiClient.post('/auth/demo');
    setAccessToken(data.accessToken);
    return data;
  },

  async getGoogleConfig(): Promise<{
    oauthConfigured: boolean;
    supabaseConfigured?: boolean;
    callbackUrl: string;
    authCallbackUrl?: string;
  }> {
    const { data } = await apiClient.get('/auth/google/config');
    return data;
  },

  async getGoogleAuthUrl(): Promise<{ url: string }> {
    const { data } = await apiClient.get('/auth/google/url');
    return data;
  },

  async supabaseExchange(accessToken: string): Promise<{ accessToken: string; user: User }> {
    const { data } = await apiClient.post('/auth/supabase', { accessToken });
    setAccessToken(data.accessToken);
    return data;
  },

  async googleSignIn(email: string, fullName?: string): Promise<{ accessToken: string; user: User }> {
    const { data } = await apiClient.post('/auth/google', { email, fullName });
    setAccessToken(data.accessToken);
    return data;
  },

  async getAdminStatus(): Promise<{
    adminClaimed: boolean;
    envPasscodeConfigured: boolean;
    localPasscodeConfigured: boolean;
    ready: boolean;
  }> {
    const { data } = await apiClient.get('/auth/admin/status');
    return data;
  },

  async bootstrapAdmin(passcode: string): Promise<{ accessToken: string; user: User }> {
    const { data } = await apiClient.post('/auth/admin/bootstrap', { passcode });
    setAccessToken(data.accessToken);
    return data;
  },

  async unlockAdmin(passcode: string): Promise<{ accessToken: string; user: User }> {
    const { data } = await apiClient.post('/auth/admin/unlock', { passcode });
    setAccessToken(data.accessToken);
    return data;
  },

  async claimAdmin(payload: {
    fullName?: string;
    email: string;
    password: string;
    passcode?: string;
  }): Promise<{ accessToken: string; user: User }> {
    const { data } = await apiClient.post('/auth/admin/claim', payload);
    setAccessToken(data.accessToken);
    return data;
  },

  async updateProfile(fullName: string, mobile: string): Promise<User> {
    const { data } = await apiClient.put('/profile', { fullName, mobile });
    return data.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.put('/profile/password', { currentPassword, newPassword });
  },

  async updatePreferences(prefs: { notifyOrders: boolean; notifyOffers: boolean; notifyDelivery: boolean }): Promise<User> {
    const { data } = await apiClient.put('/profile/preferences', prefs);
    return data.user;
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/profile');
    setAccessToken(null);
  },

  async getNotifications(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    const { data } = await apiClient.get('/notifications');
    return data;
  },

  async markNotificationRead(id: number): Promise<void> {
    await apiClient.put(`/notifications/${id}/read`);
  },

  async markAllNotificationsRead(): Promise<void> {
    await apiClient.put('/notifications/read-all');
  },

  async deleteNotification(id: number): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },

  async clearNotifications(readOnly = false): Promise<void> {
    await apiClient.delete('/notifications', { params: { readOnly } });
  },
};
