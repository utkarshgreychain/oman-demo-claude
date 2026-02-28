import type { Conversation } from '../types/chat';
import api from './api';

export const chatService = {
  getConversations: async (): Promise<Conversation[]> => {
    const { data } = await api.get('/conversations');
    return data;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const { data } = await api.get(`/conversations/${id}`);
    return data;
  },

  deleteConversation: async (id: string): Promise<void> => {
    await api.delete(`/conversations/${id}`);
  },

  // Note: streaming is handled by useSSEChat hook, not here
  // This just provides the URL for the SSE endpoint
  getStreamUrl: () => '/api/chat/stream',
};
