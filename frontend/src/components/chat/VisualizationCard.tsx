import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Visualization } from '../../types/visualization';

const CHART_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

interface VisualizationCardProps {
  visualization: Visualization;
}

function transformData(viz: Visualization) {
  if (!viz.data?.labels || !viz.data?.datasets) return [];
  return viz.data.labels.map((label, i) => {
    const point: Record<string, any> = { name: label };
    viz.data!.datasets.forEach((ds) => {
      const values = ds.data || ds.values || [];
      point[ds.label] = values[i] ?? 0;
    });
    return point;
  });
}

function transformPieData(viz: Visualization) {
  if (!viz.data?.labels || !viz.data?.datasets?.[0]) return [];
  const ds = viz.data.datasets[0];
  const values = ds.data || ds.values || [];
  return viz.data.labels.map((label, i) => ({
    name: label,
    value: values[i] ?? 0,
  }));
}

const tooltipStyle = {
  backgroundColor: 'rgba(15, 10, 30, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#e2e8f0',
  backdropFilter: 'blur(12px)',
};

export function VisualizationCard({ visualization }: VisualizationCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#0f0a1e',
        scale: 2,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${visualization.title || 'chart'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Fallback to SVG download
      const svg = chartRef.current.querySelector('svg');
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${visualization.title || 'chart'}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [visualization.title]);

  if (!visualization.data) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface p-4 max-w-lg">
        <div className="flex items-center gap-2 text-text-secondary">
          <BarChart3 size={16} />
          <span className="text-sm">{visualization.title || 'Chart'}</span>
        </div>
        <p className="text-sm text-text-secondary mt-2">No chart data available</p>
      </div>
    );
  }

  const data = transformData(visualization);
  const pieData = transformPieData(visualization);
  const datasetLabels = visualization.data.datasets.map((ds) => ds.label);
  const chartType = visualization.chart_type;

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
      case 'horizontal_bar':
      case 'stacked_bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout={chartType === 'horizontal_bar' ? 'vertical' : 'horizontal'}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              {chartType === 'horizontal_bar' ? (
                <>
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={100} />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                </>
              )}
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              {datasetLabels.map((label, i) => (
                <Bar
                  key={label}
                  dataKey={label}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  stackId={chartType === 'stacked_bar' ? 'stack' : undefined}
                  radius={chartType !== 'stacked_bar' ? [4, 4, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              {datasetLabels.map((label, i) => (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              {datasetLabels.map((label, i) => (
                <Area
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'donut' ? 60 : 0}
                outerRadius={100}
                dataKey="value"
                label={(props: any) => `${props.name || ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              {datasetLabels.map((label, i) => (
                <Scatter key={label} name={label} dataKey={label} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              {datasetLabels.map((label, i) => (
                <Bar key={label} dataKey={label} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-3 rounded-xl glass overflow-hidden max-w-lg"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-glass-border">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-primary" />
          <span className="text-sm font-medium text-text-primary truncate">
            {visualization.title || 'Chart'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors cursor-pointer"
          aria-label="Download chart"
        >
          <Download size={16} />
        </button>
      </div>
      <div ref={chartRef} className="p-4 bg-background/50">
        {renderChart()}
      </div>
    </motion.div>
  );
}
