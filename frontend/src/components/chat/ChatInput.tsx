import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Square, Globe, ChevronDown, Check, Search } from 'lucide-react';
import { useSSEChat } from '../../hooks/useSSEChat';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useConfigStore } from '../../stores/configStore';
import { useUIStore } from '../../stores/uiStore';
import { FileUploadPreview } from './FileUploadPreview';
import { Spinner } from '../shared/Spinner';
import { getModelTier, getTierLabel, getTierColor } from '../../utils/modelTiers';

export function ChatInput() {
  const [inputValue, setInputValue] = useState('');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const modelSearchRef = useRef<HTMLInputElement>(null);

  const { isStreaming, sendMessage, stopStreaming } = useSSEChat();
  const { uploadedFiles, uploading, uploadFile, removeFile, clearFiles } = useFileUpload();
  const {
    llmProviders,
    selectedProvider,
    selectedModel,
    setSelectedProvider,
    setSelectedModel,
  } = useConfigStore();
  const { webSearchEnabled, setWebSearchEnabled } = useUIStore();

  const activeProvider = llmProviders.find((p) => p.name === selectedProvider);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;

    const fileIds = uploadedFiles.map((f) => f.id);
    sendMessage(trimmed, fileIds);
    setInputValue('');
    clearFiles();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue, isStreaming, uploadedFiles, sendMessage, clearFiles]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    const lineHeight = 24;
    const maxHeight = lineHeight * 6;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        await uploadFile(file);
      } catch {
        // Error handled by hook
      }
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectModel = (providerName: string, model: string) => {
    setSelectedProvider(providerName);
    setSelectedModel(model);
    setModelDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  const handleDropdownBlur = useCallback((e: React.FocusEvent) => {
    if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.relatedTarget as Node)) {
      setModelDropdownOpen(false);
    }
  }, []);

  const canSend = inputValue.trim().length > 0 && !isStreaming && !uploading;

  return (
    <div className="border-t border-glass-border glass">
      {/* File previews */}
      <FileUploadPreview files={uploadedFiles} onRemove={removeFile} />

      {/* Input row */}
      <div className="flex items-end gap-2 p-4">
        {/* File attach button */}
        <button
          type="button"
          onClick={handleFileClick}
          disabled={isStreaming}
          className="
            shrink-0 p-2.5 rounded-xl
            text-text-secondary hover:text-text-primary
            hover:bg-surface-light transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
            cursor-pointer
          "
          aria-label="Attach file"
        >
          <Paperclip size={20} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isStreaming}
            rows={1}
            className="
              w-full resize-none
              px-4 py-3 rounded-xl
              bg-surface-light border border-border
              text-text-primary text-sm placeholder:text-text-secondary
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
              disabled:opacity-60
              transition-colors
            "
            style={{ minHeight: '48px', maxHeight: '144px' }}
          />
        </div>

        {/* Web search toggle */}
        <button
          type="button"
          onClick={() => setWebSearchEnabled(!webSearchEnabled)}
          className={`
            shrink-0 p-2.5 rounded-xl transition-colors cursor-pointer
            ${
              webSearchEnabled
                ? 'bg-primary/20 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
            }
          `}
          aria-label={webSearchEnabled ? 'Disable web search' : 'Enable web search'}
          title={webSearchEnabled ? 'Web search enabled' : 'Enable web search'}
        >
          <Globe size={20} />
        </button>

        {/* Send / Stop button */}
        {isStreaming ? (
          <motion.button
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            type="button"
            onClick={stopStreaming}
            className="
              shrink-0 p-2.5 rounded-xl
              bg-error text-white
              hover:bg-red-600 transition-colors
              cursor-pointer
            "
            aria-label="Stop generating"
          >
            <Square size={20} />
          </motion.button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="
              shrink-0 p-2.5 rounded-xl
              bg-primary text-white
              hover:bg-primary-hover transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              cursor-pointer
            "
            aria-label="Send message"
          >
            {uploading ? <Spinner size="sm" color="#fff" /> : <Send size={20} />}
          </button>
        )}
      </div>

      {/* Model selector row */}
      <div className="flex items-center gap-2 px-4 pb-3" ref={modelDropdownRef} onBlur={handleDropdownBlur}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="
              flex items-center gap-1.5 px-3 py-1.5
              text-xs text-text-secondary
              hover:text-text-primary hover:bg-surface-light
              rounded-lg transition-colors cursor-pointer
              border border-transparent hover:border-border
            "
          >
            <span className="truncate max-w-[200px]">
              {activeProvider?.display_name || selectedProvider || 'Select model'}
              {selectedModel ? ` / ${selectedModel}` : ''}
            </span>
            <motion.span
              animate={{ rotate: modelDropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} />
            </motion.span>
          </button>

          <AnimatePresence>
            {modelDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scaleY: 0.95 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: 4, scaleY: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="
                  absolute bottom-full mb-2 left-0
                  min-w-[300px] max-h-80 overflow-hidden flex flex-col
                  glass-strong rounded-lg
                  z-50 origin-bottom
                "
              >
                {/* Search input */}
                <div className="p-2 border-b border-glass-border">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      ref={modelSearchRef}
                      type="text"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Search models..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-light border border-glass-border rounded-md text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary/50"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Model list */}
                <div className="overflow-auto py-1">
                  {llmProviders
                    .filter((p) => p.is_active && p.connection_status === 'connected')
                    .map((provider) => {
                      const filteredModels = provider.models.filter((m) =>
                        m.toLowerCase().includes(modelSearch.toLowerCase()) ||
                        provider.display_name.toLowerCase().includes(modelSearch.toLowerCase())
                      );
                      if (filteredModels.length === 0) return null;
                      return (
                        <div key={provider.id}>
                          <div className="px-3 py-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            {provider.display_name}
                          </div>
                          {filteredModels.map((model) => {
                            const isSelected =
                              selectedProvider === provider.name && selectedModel === model;
                            const tier = getModelTier(model);
                            const tierLabel = getTierLabel(tier);
                            const tierColor = getTierColor(tier);
                            return (
                              <button
                                key={`${provider.name}-${model}`}
                                type="button"
                                onClick={() => {
                                  handleSelectModel(provider.name, model);
                                  setModelSearch('');
                                }}
                                className={`
                                  w-full flex items-center justify-between gap-2
                                  px-3 py-2 text-sm cursor-pointer transition-colors
                                  ${
                                    isSelected
                                      ? 'bg-primary/10 text-primary'
                                      : 'text-text-primary hover:bg-surface-light'
                                  }
                                `}
                              >
                                <span className="truncate">{model}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${tierColor}`}>
                                    {tierLabel}
                                  </span>
                                  {isSelected && <Check size={14} className="text-primary" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}

                  {llmProviders.filter((p) => p.is_active && p.connection_status === 'connected')
                    .length === 0 && (
                    <div className="px-3 py-4 text-sm text-text-secondary text-center">
                      No providers configured
                    </div>
                  )}

                  {llmProviders
                    .filter((p) => p.is_active && p.connection_status === 'connected')
                    .every((p) => p.models.every((m) => !m.toLowerCase().includes(modelSearch.toLowerCase()) && !p.display_name.toLowerCase().includes(modelSearch.toLowerCase()))) &&
                    modelSearch && (
                    <div className="px-3 py-4 text-sm text-text-secondary text-center">
                      No models match "{modelSearch}"
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {webSearchEnabled && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xs text-primary flex items-center gap-1"
          >
            <Globe size={12} />
            Web search on
          </motion.span>
        )}
      </div>
    </div>
  );
}
