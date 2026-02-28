import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, MessageSquare, FileText, Cpu, FolderOpen } from 'lucide-react';
import { staggerContainer, staggerItem } from '../utils/animations';
import { useDashboardStore } from '../stores/dashboardStore';
import { Skeleton } from '../components/shared/Skeleton';

export function DashboardPage() {
  const { stats, collections, fetchStats, fetchCollections } = useDashboardStore();

  useEffect(() => {
    fetchStats();
    fetchCollections();
  }, [fetchStats, fetchCollections]);

  const statCards = [
    { label: 'Conversations', value: stats?.conversations ?? '--', icon: MessageSquare, color: 'text-primary' },
    { label: 'Files Uploaded', value: stats?.files ?? '--', icon: FileText, color: 'text-green-400' },
    { label: 'Active Providers', value: stats?.providers ?? '--', icon: Cpu, color: 'text-amber-400' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Overview of your workspace
          </p>
        </div>

        {/* Stats Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <motion.div
              key={label}
              variants={staggerItem}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">{label}</p>
                  {stats ? (
                    <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
                  ) : (
                    <Skeleton variant="text" className="w-12 h-8 mt-1" />
                  )}
                </div>
                <div className={`p-3 rounded-xl bg-surface-light ${color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Collections */}
        {collections.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Collections</h2>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {collections.map((collection) => (
                <motion.div
                  key={collection.id}
                  variants={staggerItem}
                  className="glass rounded-xl p-4 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${collection.color}20` }}
                  >
                    <FolderOpen size={20} style={{ color: collection.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{collection.name}</p>
                    <p className="text-xs text-text-secondary">
                      {collection.file_count} {collection.file_count === 1 ? 'file' : 'files'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Charts placeholder */}
        <div className="glass rounded-xl p-8 text-center">
          <BarChart3 size={48} className="text-text-secondary mx-auto mb-3 opacity-40" />
          <p className="text-text-secondary">
            Upload Excel or CSV files to see auto-generated visualizations here.
          </p>
        </div>
      </div>
    </div>
  );
}
