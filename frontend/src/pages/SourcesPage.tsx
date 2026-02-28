import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Upload, Plus, FileText, File, Image, Table, X } from 'lucide-react';
import { useSourcesStore } from '../stores/sourcesStore';
import { fileService } from '../services/fileService';
import { staggerContainer, staggerItem } from '../utils/animations';
import { Skeleton } from '../components/shared/Skeleton';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';

const FILE_ICONS: Record<string, typeof FileText> = {
  'application/pdf': FileText,
  'text/plain': FileText,
  'text/csv': Table,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': Table,
  'application/vnd.ms-excel': Table,
  'image/png': Image,
  'image/jpeg': Image,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCollections();
    fetchFiles();
  }, [fetchCollections, fetchFiles]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    await createCollection(newCollectionName.trim(), undefined, newCollectionColor);
    setNewCollectionName('');
    setNewCollectionColor('#6366f1');
    setShowCreateModal(false);
  };

  const handleUpload = useCallback(async (fileList: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const uploaded = await fileService.uploadFile(file);
        if (selectedCollectionId) {
          await addFileToCollection(selectedCollectionId, uploaded.id);
        }
      }
      await fetchFiles(selectedCollectionId || undefined);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [selectedCollectionId, addFileToCollection, fetchFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const selectedFile = files.find(f => f.id === selectedFileId);

  const COLORS = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

  return (
    <div className="flex h-full">
      {/* Left: Source Chat Panel placeholder */}
      <div className="w-1/2 border-r border-glass-border flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <FolderOpen size={48} className="text-text-secondary mx-auto mb-3 opacity-40" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">Sources Chat</h2>
          <p className="text-sm text-text-secondary max-w-sm">
            {selectedCollectionId
              ? `Chat with ${files.length} file${files.length !== 1 ? 's' : ''} in this collection. File context is auto-included.`
              : 'Select a collection on the right to chat with your documents.'}
          </p>
        </div>
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
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors cursor-pointer shrink-0"
          >
            <Plus size={16} />
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
                const FileIcon = FILE_ICONS[file.mime_type] || File;
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
                        {file.original_name || file.filename}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatFileSize(file.size_bytes)} &middot; {new Date(file.created_at).toLocaleDateString()}
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
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary truncate">
                    {selectedFile.original_name || selectedFile.filename}
                  </h3>
                  <button
                    onClick={() => setSelectedFileId(null)}
                    className="p-1 text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="text-xs text-text-secondary space-y-1">
                  <p>Size: {formatFileSize(selectedFile.size_bytes)}</p>
                  <p>Type: {selectedFile.mime_type}</p>
                  <p>Uploaded: {new Date(selectedFile.created_at).toLocaleString()}</p>
                  {selectedFile.row_count && <p>Rows: {selectedFile.row_count.toLocaleString()}</p>}
                  {selectedFile.column_names && (
                    <p>Columns: {(selectedFile.column_names as string[]).join(', ')}</p>
                  )}
                </div>
                {selectedFile.summary && (
                  <div className="pt-2 border-t border-glass-border">
                    <p className="text-xs font-medium text-text-secondary mb-1">Summary</p>
                    <p className="text-xs text-text-primary">{selectedFile.summary}</p>
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
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-glass-border text-text-secondary hover:text-text-primary hover:border-primary/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload size={16} />
            <span className="text-sm">
              {uploading ? 'Uploading...' : dragging ? 'Drop files here' : 'Upload files'}
            </span>
          </button>
        </div>
      </div>

      {/* Create collection modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
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
                  className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${newCollectionColor === c ? 'ring-2 ring-offset-2 ring-offset-surface scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateCollection} disabled={!newCollectionName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
