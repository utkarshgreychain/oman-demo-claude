import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, MessageSquare, FileText, Cpu, FolderOpen, ChevronDown } from 'lucide-react';
import { staggerContainer, staggerItem } from '../utils/animations';
import { useDashboardStore } from '../stores/dashboardStore';
import { collectionService, type UploadedFile } from '../services/collectionService';
import { Skeleton } from '../components/shared/Skeleton';
import { VisualizationCard } from '../components/chat/VisualizationCard';
import type { Visualization } from '../types/visualization';

/** Parse CSV text into { headers, rows } */
function parseCSVData(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow).filter(r => r.length === headers.length);
  return { headers, rows };
}

/** Auto-generate visualization configs from tabular file data */
function generateVisualizations(file: UploadedFile, content: string): Visualization[] {
  const { headers, rows } = parseCSVData(content);
  if (headers.length < 2 || rows.length < 2) return [];

  const vizs: Visualization[] = [];
  const labelCol = 0; // assume first column is labels
  const labels = rows.map(r => r[labelCol]).slice(0, 20); // max 20 items

  // Find numeric columns
  const numericCols: number[] = [];
  for (let c = 1; c < headers.length; c++) {
    const isNumeric = rows.slice(0, 10).every(r => !isNaN(parseFloat(r[c])) || r[c] === '');
    if (isNumeric) numericCols.push(c);
  }

  if (numericCols.length === 0) return [];

  // Generate bar chart of first 1-3 numeric columns
  const barCols = numericCols.slice(0, 3);
  vizs.push({
    viz_id: `${file.id}-bar`,
    chart_type: 'bar',
    title: `${headers[labelCol]} by ${barCols.map(c => headers[c]).join(', ')}`,
    x_label: headers[labelCol],
    y_label: barCols.length === 1 ? headers[barCols[0]] : 'Value',
    data: {
      labels,
      datasets: barCols.map(c => ({
        label: headers[c],
        data: rows.slice(0, 20).map(r => parseFloat(r[c]) || 0),
      })),
    },
    _source: file.filename,
    _chartTypeLabel: 'Bar Chart',
  } as Visualization & { _source: string; _chartTypeLabel: string });

  // Generate pie chart if there's a single numeric column and <= 10 labels
  if (numericCols.length >= 1 && labels.length <= 10) {
    const pieCol = numericCols[0];
    vizs.push({
      viz_id: `${file.id}-pie`,
      chart_type: 'pie',
      title: `${headers[pieCol]} Distribution`,
      data: {
        labels,
        datasets: [{
          label: headers[pieCol],
          data: rows.slice(0, 10).map(r => parseFloat(r[pieCol]) || 0),
        }],
      },
      _source: file.filename,
      _chartTypeLabel: 'Pie Chart',
    } as Visualization & { _source: string; _chartTypeLabel: string });
  }

  // Generate line chart if there are multiple data points
  if (numericCols.length >= 1 && rows.length >= 3) {
    const lineCols = numericCols.slice(0, 2);
    vizs.push({
      viz_id: `${file.id}-line`,
      chart_type: 'line',
      title: `${lineCols.map(c => headers[c]).join(' & ')} Trend`,
      x_label: headers[labelCol],
      data: {
        labels,
        datasets: lineCols.map(c => ({
          label: headers[c],
          data: rows.slice(0, 20).map(r => parseFloat(r[c]) || 0),
        })),
      },
      _source: file.filename,
      _chartTypeLabel: 'Line Chart',
    } as Visualization & { _source: string; _chartTypeLabel: string });
  }

  return vizs;
}

interface VizTooltipProps {
  viz: Visualization & { _source?: string; _chartTypeLabel?: string };
}

function VizTooltip({ viz }: VizTooltipProps) {
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none">
      <div className="glass-strong rounded-lg px-3 py-2 text-xs max-w-xs shadow-lg">
        <p className="text-text-primary font-medium">{viz.title}</p>
        {viz._source && <p className="text-text-secondary mt-0.5">Source: {viz._source}</p>}
        {viz._chartTypeLabel && <p className="text-text-secondary">Type: {viz._chartTypeLabel}</p>}
        {viz.data?.datasets && (
          <p className="text-text-secondary">
            {viz.data.labels.length} data points, {viz.data.datasets.length} series
          </p>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { stats, collections, selectedCollectionId, fetchStats, fetchCollections, setSelectedCollectionId } = useDashboardStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [vizLoading, setVizLoading] = useState(false);
  const [visualizations, setVisualizations] = useState<(Visualization & { _source?: string; _chartTypeLabel?: string })[]>([]);
  const [hoveredVizId, setHoveredVizId] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchCollections();
  }, [fetchStats, fetchCollections]);

  // When a collection is selected, generate visualizations from its files
  useEffect(() => {
    if (!selectedCollectionId) {
      setVisualizations([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setVizLoading(true);
      try {
        const files = await collectionService.getFiles(selectedCollectionId);
        const tabularFiles = files.filter(f =>
          ['.csv', '.tsv', '.xlsx', '.xls'].includes(f.file_type)
        );

        const allViz: (Visualization & { _source?: string; _chartTypeLabel?: string })[] = [];
        for (const file of tabularFiles) {
          try {
            const fileWithData = await collectionService.getFileWithData(file.id);
            if (fileWithData.parsed_content && !cancelled) {
              const vizs = generateVisualizations(fileWithData, fileWithData.parsed_content);
              allViz.push(...vizs);
            }
          } catch {
            // Skip files that fail to load
          }
        }

        if (!cancelled) setVisualizations(allViz);
      } catch (err) {
        console.error('Failed to generate visualizations:', err);
      } finally {
        if (!cancelled) setVizLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedCollectionId]);

  const selectedCollection = collections.find(c => c.id === selectedCollectionId);

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

        {/* Collection Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 w-full px-4 py-3 glass rounded-xl cursor-pointer hover:border-primary/30 border border-transparent transition-colors"
          >
            <FolderOpen size={20} className="text-primary shrink-0" />
            <span className="text-sm text-text-primary flex-1 text-left">
              {selectedCollection
                ? `${selectedCollection.name} (${selectedCollection.file_count} files)`
                : 'Select a collection to view insights'}
            </span>
            <motion.span animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={16} className="text-text-secondary" />
            </motion.span>
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1 left-0 right-0 z-20 glass-strong rounded-xl overflow-hidden shadow-lg"
              >
                {/* None option */}
                <button
                  onClick={() => { setSelectedCollectionId(null); setDropdownOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left cursor-pointer transition-colors ${
                    !selectedCollectionId ? 'bg-primary/10 text-primary' : 'text-text-primary hover:bg-surface-light'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-surface-light" />
                  <span>No collection (overview)</span>
                </button>

                {collections.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCollectionId(c.id); setDropdownOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left cursor-pointer transition-colors ${
                      selectedCollectionId === c.id ? 'bg-primary/10 text-primary' : 'text-text-primary hover:bg-surface-light'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs text-text-secondary">{c.file_count} files</span>
                  </button>
                ))}

                {collections.length === 0 && (
                  <div className="px-4 py-4 text-sm text-text-secondary text-center">
                    No collections yet. Create one in Sources.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Visualizations */}
        {selectedCollectionId ? (
          vizLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} variant="rectangular" className="h-80 rounded-xl" />
              ))}
            </div>
          ) : visualizations.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {visualizations.map((viz) => (
                <motion.div
                  key={viz.viz_id}
                  variants={staggerItem}
                  className="relative"
                  onMouseEnter={() => setHoveredVizId(viz.viz_id)}
                  onMouseLeave={() => setHoveredVizId(null)}
                >
                  <AnimatePresence>
                    {hoveredVizId === viz.viz_id && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <VizTooltip viz={viz} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <VisualizationCard visualization={viz} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="glass rounded-xl p-8 text-center">
              <BarChart3 size={48} className="text-text-secondary mx-auto mb-3 opacity-40" />
              <p className="text-text-secondary">
                No visualizable data found in this collection. Upload Excel or CSV files to see insights.
              </p>
            </div>
          )
        ) : (
          /* Default: Collections grid or empty state */
          collections.length > 0 ? (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Collections</h2>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {collections.map((collection) => (
                  <motion.button
                    key={collection.id}
                    variants={staggerItem}
                    onClick={() => setSelectedCollectionId(collection.id)}
                    className="glass rounded-xl p-4 flex items-center gap-3 text-left cursor-pointer hover:border-primary/30 border border-transparent transition-colors"
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
                  </motion.button>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="glass rounded-xl p-8 text-center">
              <BarChart3 size={48} className="text-text-secondary mx-auto mb-3 opacity-40" />
              <p className="text-text-secondary">
                Upload Excel or CSV files to see auto-generated visualizations here.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
