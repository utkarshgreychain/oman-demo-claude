import { motion } from 'framer-motion';
import { Star, Edit, Trash2 } from 'lucide-react';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import type { LLMProvider } from '../../types/config';

interface LLMProviderCardProps {
  provider: LLMProvider;
  onEdit?: (provider: LLMProvider) => void;
  onDelete?: (provider: LLMProvider) => void;
  onSetDefault?: (provider: LLMProvider) => void;
  onRefresh: () => void;
}

export function LLMProviderCard({
  provider,
  onEdit,
  onDelete,
  onSetDefault,
}: LLMProviderCardProps) {
  const isConnected = provider.connection_status === 'connected';
  const selectedModel = provider.models?.[0] || 'No model selected';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="relative bg-surface border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
    >
      {/* Default badge */}
      {provider.is_default && (
        <div className="absolute top-3 right-3">
          <Badge variant="warning">
            <Star size={12} className="mr-1" />
            Default
          </Badge>
        </div>
      )}

      {/* Connection status indicator */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
            isConnected ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.4)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.4)]'
          }`}
        />
        <h3 className="text-text-primary font-semibold text-base truncate">
          {provider.display_name}
        </h3>
      </div>

      {/* Model info */}
      <p className="text-text-secondary text-sm mb-1 truncate">
        Provider: <span className="text-text-primary">{provider.name}</span>
      </p>
      <p className="text-text-secondary text-sm mb-1 truncate">
        Model: <span className="text-text-primary">{selectedModel}</span>
      </p>
      <p className="text-text-secondary text-sm mb-4">
        Status:{' '}
        <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        {!provider.is_default && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Star size={14} />}
            onClick={() => onSetDefault?.(provider)}
          >
            Set Default
          </Button>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          icon={<Edit size={14} />}
          onClick={() => onEdit?.(provider)}
          aria-label="Edit provider"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          onClick={() => onDelete?.(provider)}
          className="hover:text-red-400"
          aria-label="Delete provider"
        />
      </div>
    </motion.div>
  );
}
