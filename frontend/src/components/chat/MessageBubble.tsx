import { useState } from 'react';
import { motion } from 'framer-motion';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Copy, Check, File } from 'lucide-react';
import type { Message } from '../../types/chat';
import { VisualizationCard } from './VisualizationCard';
import { formatDate } from '../../utils/formatters';
import { processMarkdown } from '../../utils/markdown';
import { markdownComponents } from '../../utils/markdownComponents';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy message');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 group ${isUser ? 'justify-end' : 'justify-start'} max-w-3xl ${isUser ? 'ml-auto' : ''}`}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <span className="text-primary text-sm font-bold">AI</span>
        </div>
      )}

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] min-w-0`}>
        {/* Message bubble */}
        <div
          className={`
            relative px-4 py-3 text-sm
            ${
              isUser
                ? 'bg-primary text-white rounded-2xl rounded-tr-md'
                : 'glass text-text-primary rounded-2xl rounded-tl-md prose prose-sm max-w-none prose-p:my-1.5 prose-pre:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:text-text-primary prose-a:text-primary prose-code:text-primary prose-code:bg-surface-light prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-strong:text-text-primary'
            }
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={markdownComponents}
            >
              {processMarkdown(message.content)}
            </Markdown>
          )}

          {/* Copy button for assistant messages */}
          {!isUser && (
            <button
              type="button"
              onClick={handleCopy}
              className="
                absolute -bottom-3 right-2
                p-1.5 rounded-lg
                bg-surface border border-border
                text-text-secondary hover:text-text-primary
                opacity-0 group-hover:opacity-100
                transition-all duration-200 cursor-pointer
                shadow-sm
              "
              aria-label="Copy message"
            >
              {copied ? (
                <Check size={14} className="text-success" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          )}
        </div>

        {/* Visualizations */}
        {message.visualizations && message.visualizations.length > 0 && (
          <div className="w-full">
            {message.visualizations.map((viz) => (
              <VisualizationCard key={viz.viz_id} visualization={viz} />
            ))}
          </div>
        )}

        {/* File chips */}
        {message.file_ids && message.file_ids.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.file_ids.map((fileId) => (
              <span
                key={fileId}
                className="
                  inline-flex items-center gap-1 px-2 py-1
                  bg-surface-light border border-border rounded-md
                  text-xs text-text-secondary
                "
              >
                <File size={12} className="text-primary" />
                <span className="truncate max-w-[100px]">{fileId}</span>
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-text-secondary mt-1.5 px-1">
          {formatDate(message.created_at)}
        </span>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white text-sm font-bold">U</span>
        </div>
      )}
    </motion.div>
  );
}
