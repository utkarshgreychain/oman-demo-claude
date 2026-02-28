import type { UploadedFile } from '../types/file';
import api from './api';

export const fileService = {
  uploadFile: async (file: File): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return data;
  },

  getFile: async (id: string): Promise<UploadedFile> => {
    const { data } = await api.get(`/files/${id}`);
    return data;
  },

  deleteFile: async (id: string): Promise<void> => {
    await api.delete(`/files/${id}`);
  },
};
