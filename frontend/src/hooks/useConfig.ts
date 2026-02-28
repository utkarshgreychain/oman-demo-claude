import { useEffect, useCallback } from 'react';
import { useConfigStore } from '../stores/configStore';
import { configService } from '../services/configService';

export function useConfig() {
  const {
    llmProviders, searchProviders,
    setLLMProviders, setSearchProviders
  } = useConfigStore();

  const loadProviders = useCallback(async () => {
    try {
      const [llm, search] = await Promise.all([
        configService.getLLMProviders(),
        configService.getSearchProviders(),
      ]);
      setLLMProviders(llm);
      setSearchProviders(search);
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return { llmProviders, searchProviders, refreshProviders: loadProviders };
}
