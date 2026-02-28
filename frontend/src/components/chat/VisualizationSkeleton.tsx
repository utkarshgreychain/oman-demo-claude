import { BarChart3 } from 'lucide-react';
import { Skeleton } from '../shared/Skeleton';

export function VisualizationSkeleton() {
  return (
    <div className="mt-3 rounded-xl glass overflow-hidden max-w-lg animate-pulse">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-glass-border">
        <BarChart3 size={16} className="text-text-secondary opacity-40" />
        <Skeleton variant="text" className="w-32 h-4" />
      </div>
      <div className="p-4 bg-background/50 flex items-end gap-2 h-[300px]">
        {[0.6, 0.8, 0.4, 0.9, 0.5, 0.7, 0.3].map((h, i) => (
          <div
            key={i}
            className="flex-1 skeleton-shimmer rounded-t"
            style={{ height: `${h * 80}%` }}
          />
        ))}
      </div>
    </div>
  );
}
