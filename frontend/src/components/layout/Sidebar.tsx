import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { ConversationSidebar } from '../chat/ConversationSidebar';

const sidebarVariants = {
  open: {
    width: 280,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
  closed: {
    width: 0,
    opacity: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
};

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <>
      {/* Collapsed toggle button (visible when sidebar is closed) */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onClick={toggleSidebar}
            className="fixed top-3 left-3 z-30 p-2 rounded-lg glass text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <PanelLeft size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="h-full glass border-r border-glass-border flex flex-col overflow-hidden shrink-0"
          >
            {/* Sidebar header with close toggle */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-glass-border shrink-0">
              <span className="text-sm font-semibold text-text-primary">Conversations</span>
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors cursor-pointer"
                aria-label="Close sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              <ConversationSidebar />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
