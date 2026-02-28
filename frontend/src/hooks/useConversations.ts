import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChatStore } from '../stores/chatStore';
import { chatService } from '../services/chatService';

export function useConversations() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    conversations, activeConversationId,
    setConversations, setActiveConversation, setMessages,
    isStreaming,
  } = useChatStore();

  const loadConversations = useCallback(async () => {
    try {
      const convs = await chatService.getConversations();
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const conv = await chatService.getConversation(id);
      setActiveConversation(id);
      setMessages(conv.messages || []);
      // Navigate to chat page if not already there
      if (location.pathname !== '/home') {
        navigate('/home');
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }, [location.pathname, navigate]);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await chatService.deleteConversation(id);
      if (activeConversationId === id) {
        setActiveConversation(null);
        setMessages([]);
      }
      await loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [activeConversationId, loadConversations]);

  const newConversation = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
    // Navigate to chat page if not already there
    if (location.pathname !== '/home') {
      navigate('/home');
    }
  }, [location.pathname, navigate]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Refresh sidebar when streaming ends (new conversation created)
  useEffect(() => {
    if (!isStreaming) {
      loadConversations();
    }
  }, [isStreaming, loadConversations]);

  return {
    conversations,
    activeConversationId,
    loadConversation,
    deleteConversation,
    newConversation,
    refreshConversations: loadConversations,
  };
}
