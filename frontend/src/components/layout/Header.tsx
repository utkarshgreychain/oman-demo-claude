import { useLocation } from 'react-router-dom';
import { useConfigStore } from '../../stores/configStore';

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/home': 'Home',
  '/sources': 'Sources',
  '/config': 'Settings',
};

export function Header() {
  const location = useLocation();
  const { selectedProvider, selectedModel } = useConfigStore();

  const pageName = pageNames[location.pathname] || '';

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-glass-border glass shrink-0">
      {/* Left: Page name */}
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-text-primary">{pageName}</span>
      </div>

      {/* Center: Current model */}
      <div className="hidden sm:flex items-center gap-2 text-sm text-text-secondary">
        {selectedProvider && selectedModel ? (
          <>
            <span className="text-text-secondary">{selectedProvider}</span>
            <span className="text-text-secondary/40">/</span>
            <span className="text-text-primary font-medium">{selectedModel}</span>
          </>
        ) : (
          <span className="text-text-secondary italic">No model selected</span>
        )}
      </div>

      {/* Right: spacer for balance */}
      <div className="w-24" />
    </header>
  );
}
