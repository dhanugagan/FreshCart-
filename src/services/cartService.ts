import { apiClient } from './api';
import type { CartSnapshot, Coupon, WishlistItem } from '../types';

export const cartService = {
  async getCart(): Promise<CartSnapshot> {
    const { data } = await apiClient.get('/cart');
    return data;
  },

  async addToCart(productId: number, quantity = 1): Promise<CartSnapshot> {
    const { data } = await apiClient.post('/cart/items', { productId, quantity });
    return data;
  },

  async updateItemQuantity(itemId: number, quantity: number): Promise<CartSnapshot> {
    const { data } = await apiClient.put(`/cart/items/${itemId}`, { quantity });
    return data;
  },

  async removeItem(itemId: number): Promise<CartSnapshot> {
    const { data } = await apiClient.delete(`/cart/items/${itemId}`);
    return data;
  },

  async clearCart(): Promise<CartSnapshot> {
    const { data } = await apiClient.delete('/cart');
    return data;
  },

  async applyCoupon(code: string): Promise<CartSnapshot> {
    const { data } = await apiClient.post('/cart/coupon', { code });
    return data;
  },

  async getWishlist(): Promise<WishlistItem[]> {
    const { data } = await apiClient.get('/wishlist');
    return data.items;
  },

  async addToWishlist(productId: number): Promise<WishlistItem[]> {
    const { data } = await apiClient.post('/wishlist/items', { productId });
    return data.items;
  },

  async removeFromWishlist(id: number): Promise<WishlistItem[]> {
    const { data } = await apiClient.delete(`/wishlist/items/${id}`);
    return data.items;
  },

  async moveWishlistToCart(id: number): Promise<{ wishlist: WishlistItem[]; cart: CartSnapshot }> {
    const { data } = await apiClient.post(`/wishlist/items/${id}/move-to-cart`);
    return data;
  },

  async getCoupons(): Promise<Coupon[]> {
    const { data } = await apiClient.get('/coupons');
    return data.coupons;
  },

  async validateCoupon(code: string, subtotal?: number): Promise<{ valid: boolean; discountAmount: number; coupon?: Coupon }> {
    const { data } = await apiClient.post('/coupons/validate', { code, subtotal });
    return data;
  },
};
