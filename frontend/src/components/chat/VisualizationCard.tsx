import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, BarChart3, Loader2 } from 'lucide-react';
import type { Visualization } from '../../types/visualization';
import { vizService } from '../../services/vizService';

interface VisualizationCardProps {
  visualization: Visualization;
}

export function VisualizationCard({ visualization }: VisualizationCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDownload = () => {
    vizService.downloadChart(visualization.viz_id, `${visualization.title || 'chart'}.png`);
  };

  const imageUrl = vizService.getDownloadUrl(visualization.viz_id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="
        mt-3 rounded-xl border border-border bg-surface overflow-hidden
        max-w-lg
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-primary" />
          <span className="text-sm font-medium text-text-primary truncate">
            {visualization.title || 'Chart'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="
            p-1.5 rounded-lg text-text-secondary
            hover:text-text-primary hover:bg-surface-light
            transition-colors cursor-pointer
          "
          aria-label="Download chart"
        >
          <Download size={16} />
        </button>
      </div>

      {/* Chart Image */}
      <div className="relative bg-surface-light">
        {!imageLoaded && !imageError && (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="text-text-secondary animate-spin" />
          </div>
        )}

        {imageError && (
          <div className="flex flex-col items-center justify-center h-48 text-text-secondary">
            <BarChart3 size={32} className="mb-2 opacity-50" />
            <span className="text-sm">Failed to load chart</span>
          </div>
        )}

        <img
          src={imageUrl}
          alt={visualization.title || 'Chart visualization'}
          className={`w-full ${imageLoaded ? 'block' : 'hidden'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      </div>
    </motion.div>
  );
}
