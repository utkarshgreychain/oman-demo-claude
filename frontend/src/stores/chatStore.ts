import { create } from 'zustand';
import type { Message, Conversation, SearchResult, ProgressStep, FileSource } from '../types/chat';
import type { Visualization } from '../types/visualization';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  status: string | null;
  searchResults: SearchResult[];
  visualizations: Visualization[];
  progressSteps: ProgressStep[];
  fileSources: FileSource[];

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (token: string) => void;
  setStatus: (status: string | null) => void;
  setSearchResults: (results: SearchResult[]) => void;
  addVisualization: (viz: Visualization) => void;
  clearVisualizations: () => void;
  upsertProgressStep: (step: ProgressStep) => void;
  setFileSources: (sources: FileSource[]) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  status: null,
  searchResults: [],
  visualizations: [],
  progressSteps: [],
  fileSources: [],

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (token) => set((state) => ({ streamingContent: state.streamingContent + token })),
  setStatus: (status) => set({ status }),
  setSearchResults: (results) => set({ searchResults: results }),
  addVisualization: (viz) => set((state) => ({ visualizations: [...state.visualizations, viz] })),
  clearVisualizations: () => set({ visualizations: [] }),
  upsertProgressStep: (step) => set((state) => {
    const idx = state.progressSteps.findIndex((s) => s.step === step.step);
    if (idx >= 0) {
      const updated = [...state.progressSteps];
      updated[idx] = step;
      return { progressSteps: updated };
    }
    return { progressSteps: [...state.progressSteps, step] };
  }),
  setFileSources: (sources) => set({ fileSources: sources }),
  resetChat: () => set({
    streamingContent: '',
    status: null,
    searchResults: [],
    visualizations: [],
    progressSteps: [],
    fileSources: [],
  }),
}));
