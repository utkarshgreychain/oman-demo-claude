import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { useConversations } from '../../hooks/useConversations';
import { formatDate, truncateText } from '../../utils/formatters';

export function ConversationSidebar() {
  const {
    conversations,
    activeConversationId,
    loadConversation,
    deleteConversation,
    newConversation,
  } = useConversations();

  // Sort conversations by most recent first
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return (
    <div className="flex flex-col h-full bg-surface border-r border-border">
      {/* Header with new chat button */}
      <div className="p-4 border-b border-border">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={newConversation}
          className="
            w-full flex items-center justify-center gap-2
            px-4 py-2.5 rounded-xl
            bg-primary text-white text-sm font-medium
            hover:bg-primary-hover transition-colors
            cursor-pointer
          "
        >
          <Plus size={18} />
          New Chat
        </motion.button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
            <MessageSquare size={24} className="mb-2 opacity-40" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {sortedConversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;

              return (
                <motion.div
                  key={conversation.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16, height: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="px-2"
                >
                  <button
                    type="button"
                    onClick={() => loadConversation(conversation.id)}
                    className={`
                      w-full flex items-start gap-3
                      px-3 py-3 rounded-xl text-left
                      transition-colors group cursor-pointer
                      ${
                        isActive
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-surface-light border border-transparent'
                      }
                    `}
                  >
                    <MessageSquare
                      size={16}
                      className={`shrink-0 mt-0.5 ${
                        isActive ? 'text-primary' : 'text-text-secondary'
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isActive ? 'text-primary' : 'text-text-primary'
                        }`}
                      >
                        {truncateText(conversation.title || 'New Conversation', 32)}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {formatDate(conversation.updated_at)}
                      </p>
                    </div>

                    {/* Delete button */}
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="
                        shrink-0 p-1.5 rounded-lg
                        text-text-secondary hover:text-error
                        hover:bg-error/10
                        opacity-0 group-hover:opacity-100
                        transition-all duration-200 cursor-pointer
                      "
                      aria-label={`Delete conversation: ${conversation.title}`}
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
