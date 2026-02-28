import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface UIState {
  sidebarOpen: boolean;
  configOpen: boolean;
  addProviderModalOpen: boolean;
  addProviderType: 'llm' | 'search';
  webSearchEnabled: boolean;
  theme: Theme;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setConfigOpen: (open: boolean) => void;
  setAddProviderModalOpen: (open: boolean, type?: 'llm' | 'search') => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Initialize theme from localStorage or default to dark
const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('theme') as Theme) || 'dark';
if (typeof window !== 'undefined') applyTheme(savedTheme);

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  configOpen: false,
  addProviderModalOpen: false,
  addProviderType: 'llm',
  webSearchEnabled: false,
  theme: savedTheme,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setConfigOpen: (open) => set({ configOpen: open }),
  setAddProviderModalOpen: (open, type) => set({
    addProviderModalOpen: open,
    ...(type && { addProviderType: type }),
  }),
  setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),
  toggleTheme: () => set((state) => {
    const newTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    return { theme: newTheme };
  }),
}));
