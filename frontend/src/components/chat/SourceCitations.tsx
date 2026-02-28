import { motion } from 'framer-motion';
import { FileText, ExternalLink } from 'lucide-react';
import type { SearchResult, FileSource } from '../../types/chat';

interface SourceCitationsProps {
  searchResults: SearchResult[];
  files?: string[];
  fileSources?: FileSource[];
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return '';
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function SourceCitations({ searchResults, files, fileSources }: SourceCitationsProps) {
  const hasWebSources = searchResults.length > 0;
  const hasFileSources = (fileSources && fileSources.length > 0) || (files && files.length > 0);

  if (!hasWebSources && !hasFileSources) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="mt-3"
    >
      <p className="text-xs text-text-secondary mb-2 font-medium uppercase tracking-wide">
        Sources
      </p>

      {/* Horizontal scrollable source cards */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {searchResults.map((result, index) => (
          <a
            key={`web-${index}`}
            id={`source-${index + 1}`}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              flex-shrink-0 w-56 p-3
              bg-surface-light border border-border rounded-lg
              hover:border-primary/50 transition-colors
              group/card cursor-pointer no-underline
            "
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="
                shrink-0 w-5 h-5 rounded-full
                bg-primary/20 text-primary
                flex items-center justify-center
                text-[10px] font-bold
              ">
                {index + 1}
              </span>
              <img
                src={getFaviconUrl(result.url)}
                alt=""
                className="w-4 h-4 rounded-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-[10px] text-text-secondary truncate">
                {getDomain(result.url)}
              </span>
              <ExternalLink size={10} className="shrink-0 text-text-secondary/50" />
            </div>
            <p className="text-xs text-text-primary font-medium line-clamp-2 group-hover/card:text-primary transition-colors">
              {result.title}
            </p>
          </a>
        ))}

        {/* File sources from done event */}
        {fileSources?.map((source, index) => (
          <div
            key={`file-source-${index}`}
            className="
              flex-shrink-0 w-44 p-3
              bg-surface-light border border-border rounded-lg
              flex items-center gap-2
            "
          >
            <FileText size={16} className="text-primary shrink-0" />
            <span className="text-xs text-text-primary truncate">{source.filename}</span>
          </div>
        ))}

        {/* Legacy file IDs */}
        {!fileSources && files?.map((fileId, index) => (
          <div
            key={`file-${index}`}
            className="
              flex-shrink-0 w-44 p-3
              bg-surface-light border border-border rounded-lg
              flex items-center gap-2
            "
          >
            <FileText size={16} className="text-primary shrink-0" />
            <span className="text-xs text-text-primary truncate">{fileId}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
