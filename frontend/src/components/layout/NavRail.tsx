import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, FolderOpen, Settings, Sun, Moon, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/home', icon: MessageSquare, label: 'Home' },
  { to: '/sources', icon: FolderOpen, label: 'Sources' },
  { to: '/config', icon: Settings, label: 'Settings' },
];

export function NavRail() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useUIStore();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userInitial = user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="w-14 shrink-0 h-full glass border-r border-glass-border flex flex-col items-center py-3 gap-1">
      {/* Navigation icons */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="group relative"
          >
            {({ isActive }) => (
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  p-2.5 rounded-xl transition-colors cursor-pointer
                  ${isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
                  }
                `}
              >
                <Icon size={20} />
                {/* Tooltip */}
                <span className="
                  absolute left-full ml-2 top-1/2 -translate-y-1/2
                  px-2 py-1 rounded-md text-xs font-medium
                  bg-surface-light text-text-primary
                  opacity-0 group-hover:opacity-100
                  pointer-events-none transition-opacity
                  whitespace-nowrap z-50
                  shadow-lg border border-glass-border
                ">
                  {label}
                </span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User avatar */}
        <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">
          {userInitial}
        </span>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="p-2 rounded-xl text-text-secondary hover:text-error hover:bg-surface-light transition-colors cursor-pointer"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
