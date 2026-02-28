import type { LLMProvider, LLMProviderCreate, SearchProvider, SearchProviderCreate, TestConnectionRequest, TestConnectionResponse } from '../types/config';
import api from './api';

export const configService = {
  // LLM Providers
  getLLMProviders: async (): Promise<LLMProvider[]> => {
    const { data } = await api.get('/config/llm-providers');
    return data;
  },
  createLLMProvider: async (provider: LLMProviderCreate): Promise<LLMProvider> => {
    const { data } = await api.post('/config/llm-providers', provider);
    return data;
  },
  updateLLMProvider: async (id: string, updates: Partial<LLMProviderCreate>): Promise<LLMProvider> => {
    const { data } = await api.put(`/config/llm-providers/${id}`, updates);
    return data;
  },
  deleteLLMProvider: async (id: string): Promise<void> => {
    await api.delete(`/config/llm-providers/${id}`);
  },
  testLLMConnection: async (req: TestConnectionRequest): Promise<TestConnectionResponse> => {
    const { data } = await api.post('/config/llm-providers/test', req);
    return data;
  },
  getProviderModels: async (id: string): Promise<string[]> => {
    const { data } = await api.get(`/config/llm-providers/${id}`);
    return data.models || [];
  },

  // Search Providers
  getSearchProviders: async (): Promise<SearchProvider[]> => {
    const { data } = await api.get('/config/search-providers');
    return data;
  },
  createSearchProvider: async (provider: SearchProviderCreate): Promise<SearchProvider> => {
    const { data } = await api.post('/config/search-providers', provider);
    return data;
  },
  updateSearchProvider: async (id: string, updates: Partial<SearchProviderCreate>): Promise<SearchProvider> => {
    const { data } = await api.put(`/config/search-providers/${id}`, updates);
    return data;
  },
  deleteSearchProvider: async (id: string): Promise<void> => {
    await api.delete(`/config/search-providers/${id}`);
  },
  testSearchConnection: async (req: TestConnectionRequest): Promise<TestConnectionResponse> => {
    const { data } = await api.post('/config/search-providers/test', req);
    return data;
  },
};
