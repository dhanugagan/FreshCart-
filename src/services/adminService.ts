import { apiClient } from './api';

export const adminService = {
  async getDashboard() {
    const { data } = await apiClient.get('/admin/dashboard');
    return data;
  },
  async getAnalytics() {
    const { data } = await apiClient.get('/admin/analytics');
    return data;
  },
  async createProduct(payload: any) {
    const { data } = await apiClient.post('/admin/products', payload);
    return data;
  },
  async updateProduct(id: number, payload: any) {
    const { data } = await apiClient.put(`/admin/products/${id}`, payload);
    return data;
  },
  async deleteProduct(id: number) {
    const { data } = await apiClient.delete(`/admin/products/${id}`);
    return data;
  },
  async getInventory() {
    const { data } = await apiClient.get('/admin/inventory');
    return data.inventory;
  },
  async getInventoryLogs() {
    const { data } = await apiClient.get('/admin/inventory/logs');
    return data.logs;
  },
  async updateInventory(productId: number, quantity: number, reason = 'manual_adjustment') {
    const { data } = await apiClient.put(`/admin/inventory/${productId}`, { quantity, reason });
    return data;
  },
  async getOrders() {
    const { data } = await apiClient.get('/admin/orders');
    return data.orders;
  },
  async updateOrderStatus(id: number, status: string) {
    const { data } = await apiClient.put(`/admin/orders/${id}/status`, { status });
    return data;
  },
  async getCustomers() {
    const { data } = await apiClient.get('/admin/customers');
    return data.customers;
  },
  async updateCustomerStatus(id: number, status: 'ACTIVE' | 'SUSPENDED') {
    const { data } = await apiClient.put(`/admin/customers/${id}/status`, { status });
    return data;
  },
  async getCoupons() {
    const { data } = await apiClient.get('/admin/coupons');
    return data.coupons;
  },
  async createCoupon(payload: any) {
    const { data } = await apiClient.post('/admin/coupons', payload);
    return data;
  },
  async deleteCoupon(id: number) {
    const { data } = await apiClient.delete(`/admin/coupons/${id}`);
    return data;
  },
};
