import { motion, AnimatePresence } from 'framer-motion';
import { File, X } from 'lucide-react';
import type { UploadedFile } from '../../types/file';
import { formatFileSize } from '../../utils/formatters';

interface FileUploadPreviewProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
}

export function FileUploadPreview({ files, onRemove }: FileUploadPreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pt-3">
      <AnimatePresence mode="popLayout">
        {files.map((file) => (
          <motion.div
            key={file.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="
              flex items-center gap-2 px-3 py-1.5
              bg-surface-light border border-border rounded-lg
              text-sm group
            "
          >
            <File size={14} className="text-primary shrink-0" />
            <span className="text-text-primary truncate max-w-[140px]">
              {file.filename}
            </span>
            <span className="text-text-secondary text-xs">
              {formatFileSize(file.file_size)}
            </span>
            <button
              type="button"
              onClick={() => onRemove(file.id)}
              className="
                ml-1 p-0.5 rounded-full
                text-text-secondary hover:text-error
                hover:bg-error/10 transition-colors cursor-pointer
              "
              aria-label={`Remove ${file.filename}`}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
