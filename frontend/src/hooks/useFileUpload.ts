import { useState, useCallback } from 'react';
import type { UploadedFile } from '../types/file';
import { fileService } from '../services/fileService';

export function useFileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await fileService.uploadFile(file);
      setUploadedFiles(prev => [...prev, uploaded]);
      return uploaded;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    fileService.deleteFile(fileId).catch(console.error);
  }, []);

  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  return { uploadedFiles, uploading, error, uploadFile, removeFile, clearFiles };
}
