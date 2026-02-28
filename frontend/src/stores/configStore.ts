import { create } from 'zustand';
import type { LLMProvider, SearchProvider } from '../types/config';

interface ConfigState {
  llmProviders: LLMProvider[];
  searchProviders: SearchProvider[];
  selectedProvider: string | null;
  selectedModel: string | null;
  selectedSearchProvider: string | null;

  setLLMProviders: (providers: LLMProvider[]) => void;
  setSearchProviders: (providers: SearchProvider[]) => void;
  setSelectedProvider: (provider: string | null) => void;
  setSelectedModel: (model: string | null) => void;
  setSelectedSearchProvider: (provider: string | null) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  llmProviders: [],
  searchProviders: [],
  selectedProvider: null,
  selectedModel: null,
  selectedSearchProvider: null,

  setLLMProviders: (providers) => {
    set({ llmProviders: providers });
    // Auto-select default provider
    const defaultProvider = providers.find(p => p.is_default && p.connection_status === 'connected');
    if (defaultProvider) {
      set({
        selectedProvider: defaultProvider.name,
        selectedModel: defaultProvider.models?.[0] || null,
      });
    }
  },
  setSearchProviders: (providers) => {
    set({ searchProviders: providers });
    const defaultSearch = providers.find(p => p.is_default && p.connection_status === 'connected');
    if (defaultSearch) {
      set({ selectedSearchProvider: defaultSearch.name });
    }
  },
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedSearchProvider: (provider) => set({ selectedSearchProvider: provider }),
}));
