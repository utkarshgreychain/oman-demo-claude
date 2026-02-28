import { create } from 'zustand';
import { collectionService, type Collection, type UploadedFile } from '../services/collectionService';

interface SourcesState {
  collections: Collection[];
  selectedCollectionId: string | null;
  files: UploadedFile[];
  selectedFileId: string | null;
  contextFileIds: string[];
  loading: boolean;

  fetchCollections: () => Promise<void>;
  createCollection: (name: string, description?: string, color?: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  setSelectedCollectionId: (id: string | null) => void;
  fetchFiles: (collectionId?: string) => Promise<void>;
  setSelectedFileId: (id: string | null) => void;
  addFileToCollection: (collectionId: string, fileId: string) => Promise<void>;
  removeFileFromCollection: (collectionId: string, fileId: string) => Promise<void>;
  setContextFileIds: (ids: string[]) => void;
}

export const useSourcesStore = create<SourcesState>((set, get) => ({
  collections: [],
  selectedCollectionId: null,
  files: [],
  selectedFileId: null,
  contextFileIds: [],
  loading: false,

  fetchCollections: async () => {
    try {
      const collections = await collectionService.getCollections();
      set({ collections });
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    }
  },

  createCollection: async (name, description, color) => {
    try {
      await collectionService.createCollection({ name, description, color });
      await get().fetchCollections();
    } catch (err) {
      console.error('Failed to create collection:', err);
    }
  },

  deleteCollection: async (id) => {
    try {
      await collectionService.deleteCollection(id);
      if (get().selectedCollectionId === id) {
        set({ selectedCollectionId: null, files: [] });
      }
      await get().fetchCollections();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  },

  setSelectedCollectionId: (id) => {
    set({ selectedCollectionId: id, selectedFileId: null });
    get().fetchFiles(id || undefined);
  },

  fetchFiles: async (collectionId?: string) => {
    set({ loading: true });
    try {
      const files = await collectionService.getFiles(collectionId);
      set({ files, contextFileIds: files.map(f => f.id) });
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      set({ loading: false });
    }
  },

  setSelectedFileId: (id) => set({ selectedFileId: id }),

  addFileToCollection: async (collectionId, fileId) => {
    try {
      await collectionService.addFileToCollection(collectionId, fileId);
      await get().fetchFiles(get().selectedCollectionId || undefined);
    } catch (err) {
      console.error('Failed to add file to collection:', err);
    }
  },

  removeFileFromCollection: async (collectionId, fileId) => {
    try {
      await collectionService.removeFileFromCollection(collectionId, fileId);
      await get().fetchFiles(get().selectedCollectionId || undefined);
    } catch (err) {
      console.error('Failed to remove file from collection:', err);
    }
  },

  setContextFileIds: (ids) => set({ contextFileIds: ids }),
}));
