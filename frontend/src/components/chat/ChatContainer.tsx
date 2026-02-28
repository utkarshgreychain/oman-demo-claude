import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useSSEChat } from '../../hooks/useSSEChat';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import { VisualizationCard } from './VisualizationCard';
import { SourceCitations } from './SourceCitations';

export function ChatContainer() {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    streamingContent,
    status,
    searchResults,
    visualizations,
    progressSteps,
    fileSources,
  } = useSSEChat();

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, status, progressSteps]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div key={message.id}>
                <MessageBubble message={message} />

                {/* Show source citations after assistant messages */}
                {message.role === 'assistant' && (
                  (message.search_results && message.search_results.length > 0) ||
                  (message.file_sources && message.file_sources.length > 0)
                ) && (
                  <div className="max-w-3xl mt-1">
                    <SourceCitations
                      searchResults={message.search_results || []}
                      files={message.file_ids}
                      fileSources={message.file_sources}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming message */}
            <AnimatePresence>
              {isStreaming && (streamingContent || status || progressSteps.length > 0) && (
                <StreamingMessage
                  content={streamingContent}
                  status={status}
                  progressSteps={progressSteps}
                />
              )}
            </AnimatePresence>

            {/* Live visualizations during streaming */}
            <AnimatePresence>
              {isStreaming && visualizations.length > 0 && visualizations.map((viz) => (
                <motion.div
                  key={viz.viz_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="max-w-3xl"
                >
                  <VisualizationCard visualization={viz} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Live source citations during streaming */}
            <AnimatePresence>
              {isStreaming && (searchResults.length > 0 || fileSources.length > 0) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="max-w-3xl"
                >
                  <SourceCitations
                    searchResults={searchResults}
                    fileSources={fileSources}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center text-center"
      >
        {/* Logo / icon area */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <MessageSquare size={32} className="text-primary" />
          </div>
          <motion.div
            className="absolute -top-1 -right-1"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles size={20} className="text-primary" />
          </motion.div>
        </div>

        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Start a conversation
        </h2>
        <p className="text-sm text-text-secondary max-w-md leading-relaxed">
          Ask me anything — I can help with analysis, writing, coding, research,
          and much more. You can also attach files or enable web search.
        </p>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 mt-6 justify-center max-w-lg">
          {[
            'Summarize a document',
            'Write a Python script',
            'Explain a concept',
            'Analyze data',
          ].map((suggestion) => (
            <motion.span
              key={suggestion}
              whileHover={{ scale: 1.05 }}
              className="
                px-3 py-1.5 text-xs rounded-full
                bg-surface-light border border-border
                text-text-secondary hover:text-text-primary
                hover:border-primary/50 transition-colors cursor-default
              "
            >
              {suggestion}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
