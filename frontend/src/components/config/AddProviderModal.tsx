import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { Dropdown } from '../shared/Dropdown';
import { TestConnectionButton } from './TestConnectionButton';
import { ModelSelector } from './ModelSelector';
import { configService } from '../../services/configService';
import type { TestConnectionResponse } from '../../types/config';

interface AddProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'llm' | 'search';
  onSuccess: () => void;
  existingNames?: string[];
}

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'groq', label: 'Groq' },
  { value: 'meta', label: 'Meta (Llama)' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'azure-openai', label: 'Azure OpenAI' },
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'ollama', label: 'Ollama' },
];

const SEARCH_PROVIDERS = [
  { value: 'tavily', label: 'Tavily' },
  { value: 'serper', label: 'Serper' },
  { value: 'brave', label: 'Brave' },
  { value: 'bing', label: 'Bing' },
  { value: 'exa', label: 'Exa' },
  { value: 'you', label: 'You.com' },
  { value: 'searxng', label: 'SearXNG' },
  { value: 'duckduckgo', label: 'DuckDuckGo' },
];

const DEFAULT_DISPLAY_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  groq: 'Groq',
  meta: 'Meta Llama',
  mistral: 'Mistral AI',
  deepseek: 'DeepSeek',
  'azure-openai': 'Azure OpenAI',
  bedrock: 'AWS Bedrock',
  ollama: 'Ollama (Local)',
  tavily: 'Tavily Search',
  serper: 'Serper Search',
  brave: 'Brave Search',
  bing: 'Bing Search',
  exa: 'Exa Search',
  you: 'You.com Search',
  searxng: 'SearXNG',
  duckduckgo: 'DuckDuckGo',
};

const SHOW_BASE_URL = new Set(['ollama', 'meta', 'azure-openai']);

// Providers that don't need an API key
const NO_API_KEY = new Set(['duckduckgo']);

// Custom labels for fields per provider
const FIELD_LABELS: Record<string, { apiKey?: string; baseUrl?: string; baseUrlPlaceholder?: string }> = {
  'azure-openai': { baseUrl: 'Resource URL', baseUrlPlaceholder: 'https://your-resource.openai.azure.com' },
  meta: { baseUrl: 'Base URL', baseUrlPlaceholder: 'https://api.together.xyz (default)' },
  searxng: { apiKey: 'Instance URL' },
  bedrock: { apiKey: 'Credentials JSON' },
};

export function AddProviderModal({ isOpen, onClose, type, onSuccess, existingNames = [] }: AddProviderModalProps) {
  const [providerName, setProviderName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [testPassed, setTestPassed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset form when modal opens/closes or type changes
  useEffect(() => {
    if (isOpen) {
      setProviderName('');
      setDisplayName('');
      setApiKey('');
      setBaseUrl('');
      setShowApiKey(false);
      setModels([]);
      setSelectedModel(null);
      setTestPassed(false);
      setSaving(false);
      setSaveError(null);
    }
  }, [isOpen, type]);

  // Auto-fill display name when provider is selected
  useEffect(() => {
    if (providerName && DEFAULT_DISPLAY_NAMES[providerName]) {
      setDisplayName(DEFAULT_DISPLAY_NAMES[providerName]);
    }
  }, [providerName]);

  // Reset test state when key fields change
  useEffect(() => {
    setTestPassed(false);
    setModels([]);
    setSelectedModel(null);
  }, [providerName, apiKey, baseUrl]);

  const handleTestConnection = async (): Promise<TestConnectionResponse> => {
    const effectiveApiKey = hideApiKey ? 'none' : apiKey;
    const request = {
      name: providerName,
      api_key: effectiveApiKey,
      ...(baseUrl && { base_url: baseUrl }),
    };

    let result: TestConnectionResponse;
    if (type === 'llm') {
      result = await configService.testLLMConnection(request);
    } else {
      result = await configService.testSearchConnection(request);
    }

    if (result.success) {
      setTestPassed(true);
      if (result.models && result.models.length > 0) {
        setModels(result.models);
        setSelectedModel(result.models[0]);
      }
    }

    return result;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const effectiveApiKey = hideApiKey ? 'none' : apiKey;
      if (type === 'llm') {
        await configService.createLLMProvider({
          name: providerName,
          display_name: displayName,
          api_key: effectiveApiKey,
          ...(baseUrl && { base_url: baseUrl }),
          ...(selectedModel && { models: [selectedModel] }),
        });
      } else {
        await configService.createSearchProvider({
          name: providerName,
          display_name: displayName,
          api_key: effectiveApiKey,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string }; status?: number }; message?: string };
      const detail = axiosErr?.response?.data?.detail;
      const status = axiosErr?.response?.status;
      if (status === 409) {
        setSaveError(`Provider "${providerName}" already exists. Delete the existing one first or choose a different provider.`);
      } else if (detail) {
        setSaveError(detail);
      } else {
        setSaveError(axiosErr?.message || 'Failed to save provider. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const allProviderOptions = type === 'llm' ? LLM_PROVIDERS : SEARCH_PROVIDERS;
  const providerOptions = allProviderOptions.filter(p => !existingNames.includes(p.value));
  const showBaseUrl = type === 'llm' && SHOW_BASE_URL.has(providerName);
  const hideApiKey = NO_API_KEY.has(providerName);
  const fieldLabels = FIELD_LABELS[providerName] || {};
  const canTest = providerName && (hideApiKey || apiKey || providerName === 'ollama');
  const canSave = testPassed && displayName;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'llm' ? 'Add LLM Provider' : 'Add Search Provider'}
      size="md"
    >
      <div className="flex flex-col gap-5">
        {/* Provider Name Dropdown */}
        <Dropdown
          options={providerOptions}
          value={providerName}
          onChange={setProviderName}
          placeholder="Select a provider"
          label="Provider"
        />

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. My OpenAI"
            className="w-full px-3 py-2 rounded-lg text-sm bg-surface-light border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
        </div>

        {/* API Key */}
        {!hideApiKey && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {fieldLabels.apiKey || 'API Key'}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  providerName === 'bedrock'
                    ? '{"accessKeyId":"...","secretAccessKey":"...","region":"us-east-1"}'
                    : providerName === 'searxng'
                    ? 'https://your-searxng-instance.com'
                    : 'Enter your API key'
                }
                className="w-full px-3 py-2 pr-10 rounded-lg text-sm bg-surface-light border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Base URL (conditional) */}
        {showBaseUrl && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {fieldLabels.baseUrl || 'Base URL'} <span className="text-text-secondary/60">(optional)</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={fieldLabels.baseUrlPlaceholder || 'e.g. http://localhost:11434'}
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface-light border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            />
          </div>
        )}

        {/* Test Connection */}
        <TestConnectionButton
          onTest={handleTestConnection}
          disabled={!canTest}
        />

        {/* Model Selector (LLM only, after successful test) */}
        {type === 'llm' && models.length > 0 && (
          <ModelSelector
            models={models}
            value={selectedModel}
            onChange={setSelectedModel}
            label="Model"
          />
        )}

        {/* Save Error */}
        {saveError && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {saveError}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!canSave}
            loading={saving}
          >
            Save Provider
          </Button>
        </div>
      </div>
    </Modal>
  );
}
