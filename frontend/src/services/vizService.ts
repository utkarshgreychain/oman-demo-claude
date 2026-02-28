export const vizService = {
  getDownloadUrl: (vizId: string): string => {
    return `/api/viz/${vizId}/download`;
  },

  downloadChart: async (vizId: string, filename: string): Promise<void> => {
    const response = await fetch(`/api/viz/${vizId}/download`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `chart-${vizId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
