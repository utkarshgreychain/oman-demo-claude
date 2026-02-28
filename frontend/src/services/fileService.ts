import type { UploadedFile } from '../types/file';
import api from './api';

export const fileService = {
  uploadFile: async (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
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
