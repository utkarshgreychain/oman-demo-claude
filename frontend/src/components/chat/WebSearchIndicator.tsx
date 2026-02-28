import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { Spinner } from '../shared/Spinner';

interface WebSearchIndicatorProps {
  query?: string;
}

export function WebSearchIndicator({ query }: WebSearchIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl max-w-md"
    >
      <div className="relative flex items-center justify-center">
        <Spinner size="sm" />
        <Globe
          size={12}
          className="absolute text-primary"
        />
      </div>

      <div className="flex flex-col">
        <motion.span
          className="text-sm text-text-primary font-medium"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          Searching the web...
        </motion.span>
        {query && (
          <span className="text-xs text-text-secondary truncate max-w-[280px]">
            &ldquo;{query}&rdquo;
          </span>
        )}
      </div>

      {/* Shimmer bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
        <motion.div
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          animate={{ x: ['-100%', '400%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
