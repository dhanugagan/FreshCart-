import { apiClient } from './api';
import type { Category, Product, ProductReview } from '../types';

export interface ProductQuery {
  category?: string;
  brand?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  priceTier?: 'low' | 'medium' | 'high';
  minRating?: number;
  inStock?: boolean;
  sort?: string;
  limit?: number;
}

export const productService = {
  async getCategories(): Promise<Category[]> {
    const { data } = await apiClient.get('/categories');
    return data.categories;
  },

  async getProducts(params?: ProductQuery): Promise<{ items: Product[]; total: number; brands: string[] }> {
    const { data } = await apiClient.get('/products', { params });
    return data;
  },

  async searchProducts(q: string): Promise<{
    items: Product[];
    suggestions: Array<{ id: number; name: string; categoryName: string; price: number }>;
  }> {
    const { data } = await apiClient.get('/products/search', { params: { q } });
    return data;
  },

  async getProductById(id: number): Promise<{ product: Product; reviews: ProductReview[]; related: Product[] }> {
    const { data } = await apiClient.get(`/products/${id}`);
    return data;
  },

  async addReview(productId: number, rating: number, comment: string): Promise<void> {
    await apiClient.post(`/products/${productId}/reviews`, { rating, comment });
  },
};
