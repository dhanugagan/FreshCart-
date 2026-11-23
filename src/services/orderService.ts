import { apiClient } from './api';
import type { Address, CartSnapshot, DeliveryTracking, Order, PaymentRecord } from '../types';

export const orderService = {
  async getAddresses(): Promise<Address[]> {
    const { data } = await apiClient.get('/addresses');
    return data.addresses;
  },

  async createAddress(payload: Omit<Address, 'id'>): Promise<Address> {
    const { data } = await apiClient.post('/addresses', payload);
    return data.address;
  },

  async updateAddress(id: number, payload: Partial<Address>): Promise<Address> {
    const { data } = await apiClient.put(`/addresses/${id}`, payload);
    return data.address;
  },

  async setDefaultAddress(id: number): Promise<void> {
    await apiClient.put(`/addresses/${id}/default`);
  },

  async deleteAddress(id: number): Promise<void> {
    await apiClient.delete(`/addresses/${id}`);
  },

  async placeOrder(payload: {
    addressId: number;
    paymentMethod: string;
    deliverySlot: string;
    deliveryInstructions?: string;
    couponCode?: string | null;
    idempotencyKey: string;
  }): Promise<Order> {
    const { data } = await apiClient.post('/orders', payload);
    return data.order;
  },

  async getOrders(): Promise<Order[]> {
    const { data } = await apiClient.get('/orders');
    return data.orders;
  },

  async getOrderDetails(id: number): Promise<{ order: Order; payment: PaymentRecord | null }> {
    const { data } = await apiClient.get(`/orders/${id}`);
    return data;
  },

  async cancelOrder(id: number): Promise<Order> {
    const { data } = await apiClient.post(`/orders/${id}/cancel`);
    return data.order;
  },

  async reorder(id: number): Promise<CartSnapshot> {
    const { data } = await apiClient.post(`/orders/${id}/reorder`);
    return data;
  },

  async getTracking(id: number): Promise<{ order: Order; tracking: DeliveryTracking }> {
    const { data } = await apiClient.get(`/orders/${id}/tracking`);
    return data;
  },

  async advanceTrackingDemo(id: number): Promise<DeliveryTracking> {
    const { data } = await apiClient.post(`/orders/${id}/tracking/advance`);
    return data.tracking;
  },
};
