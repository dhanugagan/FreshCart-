import { apiClient } from './api';

export interface UserDocumentItem {
  id: number;
  title: string;
  docType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageUrl: string;
  storageProvider: string;
  createdAt: string;
}

export const storageService = {
  async uploadProductImage(productId: number, fileName: string, dataUrl: string): Promise<{ ok: boolean; imageUrl: string; storageProvider: string }> {
    const { data } = await apiClient.post('/storage/product-image', { productId, fileName, dataUrl });
    return data;
  },

  async getDocuments(): Promise<{ documents: UserDocumentItem[]; supabaseStorageActive: boolean }> {
    const { data } = await apiClient.get('/storage/documents');
    return data;
  },

  async uploadDocument(payload: {
    title: string;
    docType: string;
    fileName: string;
    dataUrl: string;
  }): Promise<UserDocumentItem> {
    const { data } = await apiClient.post('/storage/documents', payload);
    return data.document;
  },

  async deleteDocument(id: number): Promise<void> {
    await apiClient.delete(`/storage/documents/${id}`);
  },
};
