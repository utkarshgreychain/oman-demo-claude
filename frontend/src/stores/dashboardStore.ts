import { create } from 'zustand';
import { collectionService, type DashboardStats, type Collection, type UploadedFile } from '../services/collectionService';

interface DashboardState {
  stats: DashboardStats | null;
  collections: Collection[];
  selectedCollectionId: string | null;
  files: UploadedFile[];
  loading: boolean;

  fetchStats: () => Promise<void>;
  fetchCollections: () => Promise<void>;
  fetchFiles: (collectionId?: string) => Promise<void>;
  setSelectedCollectionId: (id: string | null) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: null,
  collections: [],
  selectedCollectionId: null,
  files: [],
  loading: false,

  fetchStats: async () => {
    try {
      const stats = await collectionService.getStats();
      set({ stats });
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  },

  fetchCollections: async () => {
    try {
      const collections = await collectionService.getCollections();
      set({ collections });
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    }
  },

  fetchFiles: async (collectionId?: string) => {
    set({ loading: true });
    try {
      const files = await collectionService.getFiles(collectionId);
      set({ files });
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      set({ loading: false });
    }
  },

  setSelectedCollectionId: (id) => {
    set({ selectedCollectionId: id });
    get().fetchFiles(id || undefined);
  },
}));
