import { motion } from 'framer-motion';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { markdownComponents } from '../../utils/markdownComponents';
import { processMarkdown } from '../../utils/markdown';
import { ThinkingSteps } from './ThinkingSteps';
import type { ProgressStep } from '../../types/chat';

interface StreamingMessageProps {
  content: string;
  status: string | null;
  progressSteps: ProgressStep[];
}

export function StreamingMessage({ content, status: _status, progressSteps }: StreamingMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3 max-w-3xl"
    >
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
        <span className="text-primary text-sm font-bold">AI</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Progress steps — Perplexity style */}
        {progressSteps.length > 0 && (
          <ThinkingSteps steps={progressSteps} />
        )}

        {/* Streaming content */}
        <div className="
          px-4 py-3 rounded-2xl rounded-tl-md
          glass
          text-text-primary text-sm
          prose prose-sm max-w-none
          prose-p:my-1.5 prose-pre:my-2 prose-ul:my-1.5 prose-ol:my-1.5
          prose-headings:text-text-primary prose-a:text-primary
          prose-code:text-primary prose-code:bg-surface-light prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-strong:text-text-primary
        ">
          {content ? (
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={markdownComponents}
            >
              {processMarkdown(content)}
            </Markdown>
          ) : (
            <div className="flex items-center gap-1 py-1">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-text-secondary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              />
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-text-secondary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-text-secondary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          )}

          {/* Pulsing cursor */}
          {content && (
            <motion.span
              className="inline-block w-2 h-4 bg-primary/70 rounded-sm ml-0.5 align-middle"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
