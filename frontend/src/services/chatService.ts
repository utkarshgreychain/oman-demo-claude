import { supabase } from '../lib/supabase';
import type { Conversation } from '../types/chat';

export const chatService = {
  getConversations: async (): Promise<Conversation[]> => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .single();
    if (convError) throw convError;

    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    if (msgError) throw msgError;

    return { ...conversation, messages: messages || [] };
  },

  deleteConversation: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  getStreamUrl: () => '/api/chat/stream',
};
