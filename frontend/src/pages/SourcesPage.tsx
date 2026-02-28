import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Upload, Plus, FileText, File, Image, Table, X, Check, Loader2 } from 'lucide-react';
import { useSourcesStore } from '../stores/sourcesStore';
import { fileService } from '../services/fileService';
import { staggerContainer, staggerItem } from '../utils/animations';
import { Skeleton } from '../components/shared/Skeleton';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { ChatContainer } from '../components/chat/ChatContainer';
import { ChatInput } from '../components/chat/ChatInput';

const FILE_ICONS: Record<string, typeof FileText> = {
  '.pdf': FileText,
  '.txt': FileText,
  '.md': FileText,
  '.csv': Table,
  '.tsv': Table,
  '.xlsx': Table,
  '.xls': Table,
  '.png': Image,
  '.jpg': Image,
  '.jpeg': Image,
};

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || isNaN(bytes) || bytes < 0) return 'Unknown size';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileExt(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

interface UploadProgressState {
  filename: string;
  percent: number;
  done: boolean;
}

export function SourcesPage() {
  const {
    collections, selectedCollectionId, files, selectedFileId, loading,
    fetchCollections, createCollection, deleteCollection,
    setSelectedCollectionId, fetchFiles, setSelectedFileId,
    addFileToCollection,
  } = useSourcesStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState('#6366f1');
  const [isCreating, setIsCreating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCollections();
    fetchFiles();
  }, [fetchCollections, fetchFiles]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await createCollection(newCollectionName.trim(), undefined, newCollectionColor);
      setNewCollectionName('');
      setNewCollectionColor('#6366f1');
      setShowCreateModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpload = useCallback(async (fileList: FileList) => {
    for (const file of Array.from(fileList)) {
      setUploadProgress({ filename: file.name, percent: 0, done: false });
      try {
        const uploaded = await fileService.uploadFile(file, (percent) => {
          setUploadProgress(prev => prev ? { ...prev, percent } : null);
        });
        setUploadProgress(prev => prev ? { ...prev, percent: 100, done: true } : null);

        if (selectedCollectionId) {
          await addFileToCollection(selectedCollectionId, uploaded.id);
        }

        // Auto-dismiss after success animation
        await new Promise(r => setTimeout(r, 1500));
        setUploadProgress(null);
      } catch (err) {
        console.error('Upload failed:', err);
        setUploadProgress(null);
      }
    }
    await fetchFiles(selectedCollectionId || undefined);
  }, [selectedCollectionId, addFileToCollection, fetchFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const selectedFile = files.find(f => f.id === selectedFileId);
  const selectedCollection = collections.find(c => c.id === selectedCollectionId);

  const COLORS = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

  return (
    <div className="flex h-full">
      {/* Left: Source Chat Panel */}
      <div className="w-1/2 border-r border-glass-border flex flex-col min-h-0">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-glass-border shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">Sources Chat</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {selectedFile
              ? `Chatting with: ${selectedFile.filename}`
              : selectedCollection
                ? `Chatting with: ${selectedCollection.name} (${files.length} files)`
                : 'Select a collection or file to chat with your documents'}
          </p>
        </div>

        {/* Chat area */}
        {(selectedCollectionId || selectedFileId) ? (
          <>
            <ChatContainer />
            <ChatInput />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <FolderOpen size={48} className="text-text-secondary mb-3 opacity-40" />
            <p className="text-sm text-text-secondary text-center max-w-sm">
              Select a collection or file on the right to start chatting with your documents.
            </p>
          </div>
        )}
      </div>

      {/* Right: Source Browser */}
      <div className="w-1/2 flex flex-col min-h-0">
        {/* Collection tabs */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-glass-border overflow-x-auto shrink-0">
          <button
            onClick={() => setSelectedCollectionId(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              !selectedCollectionId
                ? 'bg-primary/20 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
            }`}
          >
            All Files
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCollectionId(c.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCollectionId === c.id
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              {c.name}
              <span className="text-text-secondary/60">({c.file_count})</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteCollection(c.id); }}
                className="hidden group-hover:block ml-1 text-text-secondary hover:text-red-400 cursor-pointer"
              >
                <X size={12} />
              </button>
            </button>
          ))}
          <button
            onClick={() => !isCreating && setShowCreateModal(true)}
            disabled={isCreating}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors cursor-pointer shrink-0 disabled:opacity-40"
          >
            {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" className="h-16 rounded-lg" />
              ))}
            </div>
          ) : files.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {files.map((file) => {
                const ext = file.file_type || getFileExt(file.filename);
                const FileIcon = FILE_ICONS[ext] || File;
                const isSelected = selectedFileId === file.id;
                return (
                  <motion.button
                    key={file.id}
                    variants={staggerItem}
                    onClick={() => setSelectedFileId(isSelected ? null : file.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected ? 'glass border border-primary/30' : 'hover:bg-surface-light'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-surface-light text-text-secondary">
                      <FileIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {file.filename}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatFileSize(file.file_size)} &middot; {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText size={32} className="text-text-secondary mb-2 opacity-40" />
              <p className="text-sm text-text-secondary">No files yet</p>
            </div>
          )}
        </div>

        {/* File detail panel */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-glass-border overflow-hidden"
            >
              <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary truncate">
                    {selectedFile.filename}
                  </h3>
                  <button
                    onClick={() => setSelectedFileId(null)}
                    className="p-1 text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="glass rounded-lg p-2">
                    <p className="text-text-secondary">Size</p>
                    <p className="text-text-primary font-medium">{formatFileSize(selectedFile.file_size)}</p>
                  </div>
                  <div className="glass rounded-lg p-2">
                    <p className="text-text-secondary">Type</p>
                    <p className="text-text-primary font-medium">{selectedFile.file_type}</p>
                  </div>
                  <div className="glass rounded-lg p-2">
                    <p className="text-text-secondary">Uploaded</p>
                    <p className="text-text-primary font-medium">{new Date(selectedFile.created_at).toLocaleDateString()}</p>
                  </div>
                  {selectedFile.row_count != null && (
                    <div className="glass rounded-lg p-2">
                      <p className="text-text-secondary">Rows</p>
                      <p className="text-text-primary font-medium">{selectedFile.row_count.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Column names */}
                {selectedFile.column_names && selectedFile.column_names.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-1">Columns</p>
                    <div className="flex flex-wrap gap-1">
                      {(selectedFile.column_names as string[]).map((col, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] rounded-full bg-surface-light text-text-secondary">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {selectedFile.summary && (
                  <div className="pt-2 border-t border-glass-border">
                    <p className="text-xs font-medium text-text-secondary mb-1">Summary</p>
                    <p className="text-xs text-text-primary leading-relaxed">{selectedFile.summary}</p>
                  </div>
                )}

                {/* Key Insights */}
                {selectedFile.key_insights && selectedFile.key_insights.length > 0 && (
                  <div className="pt-2 border-t border-glass-border">
                    <p className="text-xs font-medium text-text-secondary mb-1">Key Insights</p>
                    <ul className="space-y-1">
                      {(selectedFile.key_insights as string[]).map((insight, i) => (
                        <li key={i} className="text-xs text-text-primary flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload zone */}
        <div
          className={`p-4 border-t border-glass-border shrink-0 ${dragging ? 'bg-primary/10' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!!uploadProgress}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-glass-border text-text-secondary hover:text-text-primary hover:border-primary/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload size={16} />
            <span className="text-sm">
              {dragging ? 'Drop files here' : 'Upload files'}
            </span>
          </button>
        </div>
      </div>

      {/* Upload progress modal */}
      <AnimatePresence>
        {uploadProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl p-6 w-80 text-center"
            >
              {uploadProgress.done ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="w-14 h-14 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                    <Check size={28} className="text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-text-primary">Upload Complete!</p>
                  <p className="text-xs text-text-secondary mt-1">{uploadProgress.filename}</p>
                </motion.div>
              ) : (
                <>
                  <div className="w-14 h-14 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-3">
                    <Upload size={24} className="text-primary animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-text-primary mb-1">Uploading...</p>
                  <p className="text-xs text-text-secondary mb-4 truncate">{uploadProgress.filename}</p>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-surface-light overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress.percent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-2">{uploadProgress.percent}%</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create collection modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !isCreating && setShowCreateModal(false)}
        title="New Collection"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="e.g. Research Papers"
              className="w-full px-3 py-2 rounded-lg text-sm bg-surface-light border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
              disabled={isCreating}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewCollectionColor(c)}
                  disabled={isCreating}
                  className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${newCollectionColor === c ? 'ring-2 ring-offset-2 ring-offset-surface scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)} disabled={isCreating}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateCollection} disabled={!newCollectionName.trim() || isCreating}>
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
