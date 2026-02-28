import type { UploadedFile } from '../types/file';
import api from './api';

export type { UploadedFile };

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  file_count: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  conversations: number;
  files: number;
  providers: number;
}

export const collectionService = {
  // Collections CRUD
  getCollections: async (): Promise<Collection[]> => {
    const { data } = await api.get('/collections');
    return data;
  },

  createCollection: async (body: { name: string; description?: string; color?: string }): Promise<Collection> => {
    const { data } = await api.post('/collections', body);
    return data;
  },

  updateCollection: async (id: string, body: { name?: string; description?: string; color?: string }): Promise<Collection> => {
    const { data } = await api.put(`/collections/${id}`, body);
    return data;
  },

  deleteCollection: async (id: string): Promise<void> => {
    await api.delete(`/collections/${id}`);
  },

  addFileToCollection: async (collectionId: string, fileId: string): Promise<void> => {
    await api.post(`/collections/${collectionId}`, { file_id: fileId });
  },

  removeFileFromCollection: async (collectionId: string, fileId: string): Promise<void> => {
    await api.delete(`/collections/${collectionId}`, { data: { file_id: fileId } });
  },

  // Files
  getFiles: async (collectionId?: string): Promise<UploadedFile[]> => {
    const params = collectionId ? `?collection_id=${collectionId}` : '';
    const { data } = await api.get(`/files/list${params}`);
    return data;
  },

  getFileWithData: async (id: string): Promise<UploadedFile> => {
    const { data } = await api.get(`/files/${id}?include=data`);
    return data;
  },

  // Dashboard stats (served via /collections?stats=true)
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/collections?stats=true');
    return data;
  },
};
