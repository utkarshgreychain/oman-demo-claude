import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { configService } from '../../services/configService';
import type { LLMProvider, SearchProvider } from '../../types/config';

interface EditProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'llm' | 'search';
  provider: LLMProvider | SearchProvider | null;
  onSuccess: () => void;
}

export function EditProviderModal({ isOpen, onClose, type, provider, onSuccess }: EditProviderModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && provider) {
      setDisplayName(provider.display_name);
      setApiKey('');
      setShowApiKey(false);
      setSaving(false);
      setSaveError(null);
    }
  }, [isOpen, provider]);

  const handleSave = async () => {
    if (!provider) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updates: Record<string, string> = {};
      if (displayName !== provider.display_name) {
        updates.display_name = displayName;
      }
      if (apiKey) {
        updates.api_key = apiKey;
      }

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      if (type === 'llm') {
        await configService.updateLLMProvider(provider.id, updates);
      } else {
        await configService.updateSearchProvider(provider.id, updates);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      setSaveError(axiosErr?.response?.data?.detail || axiosErr?.message || 'Failed to update provider.');
    } finally {
      setSaving(false);
    }
  };

  if (!provider) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${provider.display_name}`}
      size="md"
    >
      <div className="flex flex-col gap-5">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-surface-light border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            API Key <span className="text-text-secondary/60">(leave blank to keep current)</span>
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter new API key"
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

        {/* Save Error */}
        {saveError && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {saveError}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!displayName}
            loading={saving}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
