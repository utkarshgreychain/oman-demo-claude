export interface VisualizationDataset {
  label: string;
  data?: number[];
  values?: number[];
}

export interface VisualizationData {
  labels: string[];
  datasets: VisualizationDataset[];
}

export interface Visualization {
  viz_id: string;
  chart_type: string;
  title: string;
  x_label?: string;
  y_label?: string;
  data?: VisualizationData;
  download_url?: string;
}
