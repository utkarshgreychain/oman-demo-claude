import { useNavigate } from 'react-router-dom';
import { Settings, MessageSquare, Sun, Moon, LogOut } from 'lucide-react';
import { useConfigStore } from '../../stores/configStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
  const navigate = useNavigate();
  const { selectedProvider, selectedModel } = useConfigStore();
  const { theme, toggleTheme } = useUIStore();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userInitial = user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-surface shrink-0">
      {/* Left: App name */}
      <div className="flex items-center gap-2">
        <MessageSquare size={20} className="text-primary" />
        <span className="text-base font-semibold text-text-primary">AI Chat</span>
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

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Settings button */}
        <button
          onClick={() => navigate('/config')}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors cursor-pointer"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>

        {/* User & Sign out */}
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
          <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">
            {userInitial}
          </span>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-surface-light transition-colors cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
