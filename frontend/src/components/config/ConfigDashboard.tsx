import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useConfig } from '../../hooks/useConfig';
import { configService } from '../../services/configService';
import { LLMProviderCard } from './LLMProviderCard';
import { SearchProviderCard } from './SearchProviderCard';
import { AddProviderModal } from './AddProviderModal';
import { EditProviderModal } from './EditProviderModal';
import { Button } from '../shared/Button';
import type { LLMProvider, SearchProvider } from '../../types/config';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export function ConfigDashboard() {
  const navigate = useNavigate();
  const { llmProviders, searchProviders, refreshProviders } = useConfig();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'llm' | 'search'>('llm');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<LLMProvider | SearchProvider | null>(null);
  const [editType, setEditType] = useState<'llm' | 'search'>('llm');

  const openModal = (type: 'llm' | 'search') => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleDeleteLLM = async (provider: LLMProvider) => {
    if (!window.confirm(`Delete "${provider.display_name}"? This cannot be undone.`)) return;
    try {
      await configService.deleteLLMProvider(provider.id);
      refreshProviders();
    } catch (err) {
      console.error('Failed to delete LLM provider:', err);
    }
  };

  const handleDeleteSearch = async (provider: SearchProvider) => {
    if (!window.confirm(`Delete "${provider.display_name}"? This cannot be undone.`)) return;
    try {
      await configService.deleteSearchProvider(provider.id);
      refreshProviders();
    } catch (err) {
      console.error('Failed to delete search provider:', err);
    }
  };

  const handleEditLLM = (provider: LLMProvider) => {
    setEditType('llm');
    setEditProvider(provider);
    setEditModalOpen(true);
  };

  const handleEditSearch = (provider: SearchProvider) => {
    setEditType('search');
    setEditProvider(provider);
    setEditModalOpen(true);
  };

  const handleSetDefaultLLM = async (provider: LLMProvider) => {
    try {
      await configService.updateLLMProvider(provider.id, { is_default: true });
      refreshProviders();
    } catch (err) {
      console.error('Failed to set default LLM provider:', err);
    }
  };

  const handleSetDefaultSearch = async (provider: SearchProvider) => {
    try {
      await configService.updateSearchProvider(provider.id, { is_default: true });
      refreshProviders();
    } catch (err) {
      console.error('Failed to set default search provider:', err);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Chat</span>
        </button>

        <h1 className="text-2xl font-bold text-text-primary mb-8">Settings</h1>

        {/* LLM Providers Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">LLM Providers</h2>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => openModal('llm')}
            >
              Add New
            </Button>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {llmProviders.map((provider) => (
              <motion.div key={provider.id} variants={itemVariants}>
                <LLMProviderCard
                  provider={provider}
                  onRefresh={refreshProviders}
                  onDelete={handleDeleteLLM}
                  onSetDefault={handleSetDefaultLLM}
                  onEdit={handleEditLLM}
                />
              </motion.div>
            ))}

            {llmProviders.length === 0 && (
              <motion.div variants={itemVariants}>
                <div className="col-span-full text-center py-12 text-text-secondary">
                  <p className="mb-2">No LLM providers configured yet.</p>
                  <p className="text-sm">Click "Add New" to get started.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* Search Providers Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Web Search Providers</h2>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => openModal('search')}
            >
              Add New
            </Button>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {searchProviders.map((provider) => (
              <motion.div key={provider.id} variants={itemVariants}>
                <SearchProviderCard
                  provider={provider}
                  onRefresh={refreshProviders}
                  onDelete={handleDeleteSearch}
                  onSetDefault={handleSetDefaultSearch}
                  onEdit={handleEditSearch}
                />
              </motion.div>
            ))}

            {searchProviders.length === 0 && (
              <motion.div variants={itemVariants}>
                <div className="col-span-full text-center py-12 text-text-secondary">
                  <p className="mb-2">No search providers configured yet.</p>
                  <p className="text-sm">Click "Add New" to add a web search provider.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* Add Provider Modal */}
        <AddProviderModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          type={modalType}
          onSuccess={refreshProviders}
          existingNames={
            modalType === 'llm'
              ? llmProviders.map(p => p.name)
              : searchProviders.map(p => p.name)
          }
        />

        <EditProviderModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          type={editType}
          provider={editProvider}
          onSuccess={refreshProviders}
        />
      </div>
    </div>
  );
}
