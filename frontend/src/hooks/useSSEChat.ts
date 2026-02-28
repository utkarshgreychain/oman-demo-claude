import { useCallback, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useConfigStore } from '../stores/configStore';
import { useUIStore } from '../stores/uiStore';
import type { ChatPayload, Message } from '../types/chat';
import { parseSSEEvents } from '../utils/sse';

export function useSSEChat() {
  const abortRef = useRef<AbortController | null>(null);

  const {
    messages, isStreaming, streamingContent, status, searchResults, visualizations,
    progressSteps, fileSources,
    setIsStreaming, setStreamingContent, appendStreamingContent, setStatus,
    setSearchResults, addVisualization, addMessage, resetChat, setActiveConversation,
    upsertProgressStep, setFileSources,
    activeConversationId,
  } = useChatStore();

  const { selectedProvider, selectedModel, selectedSearchProvider } = useConfigStore();
  const { webSearchEnabled } = useUIStore();

  const sendMessage = useCallback(async (message: string, fileIds: string[] = []) => {
    if (!selectedProvider || !selectedModel) return;

    resetChat();
    setIsStreaming(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConversationId || '',
      role: 'user',
      content: message,
      file_ids: fileIds,
      created_at: new Date().toISOString(),
    };
    addMessage(userMessage);

    const payload: ChatPayload = {
      conversation_id: activeConversationId,
      message,
      provider: selectedProvider,
      model: selectedModel,
      file_ids: fileIds,
      web_search_enabled: webSearchEnabled,
      search_provider: webSearchEnabled ? selectedSearchProvider : null,
      temperature: 0.7,
      max_tokens: 4096,
    };

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;
          const events = parseSSEEvents(part + '\n\n');

          for (const event of events) {
            switch (event.type) {
              case 'status':
                setStatus(event.data.content);
                break;
              case 'progress':
                upsertProgressStep({
                  step: event.data.step,
                  label: event.data.label,
                  status: event.data.status,
                  detail: event.data.detail,
                });
                // Also set legacy status for backward compat
                if (event.data.status === 'in_progress') {
                  setStatus(event.data.label);
                }
                break;
              case 'token':
                appendStreamingContent(event.data.content);
                break;
              case 'visualization':
                addVisualization(event.data);
                break;
              case 'search_results':
                setSearchResults(event.data.results);
                break;
              case 'done':
                if (event.data.conversation_id) {
                  setActiveConversation(event.data.conversation_id);
                }
                if (event.data.file_sources) {
                  setFileSources(event.data.file_sources);
                }
                break;
              case 'error':
                console.error('Stream error:', event.data.message);
                break;
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('SSE Error:', err);
      }
    } finally {
      // Finalize the assistant message
      const state = useChatStore.getState();
      const content = state.streamingContent;
      if (content) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          conversation_id: state.activeConversationId || '',
          role: 'assistant',
          content,
          visualizations: state.visualizations,
          search_results: state.searchResults,
          file_sources: state.fileSources,
          created_at: new Date().toISOString(),
        };
        addMessage(assistantMessage);
      }
      setStreamingContent('');
      setStatus(null);
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [selectedProvider, selectedModel, selectedSearchProvider, webSearchEnabled, activeConversationId]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    status,
    searchResults,
    visualizations,
    progressSteps,
    fileSources,
    sendMessage,
    stopStreaming,
  };
}
