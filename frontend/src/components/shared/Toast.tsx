import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const typeConfig: Record<
  ToastType,
  { icon: typeof CheckCircle; bgClass: string; borderClass: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-green-900/30',
    borderClass: 'border-green-500/40',
    iconClass: 'text-green-400',
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-red-900/30',
    borderClass: 'border-red-500/40',
    iconClass: 'text-red-400',
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-900/30',
    borderClass: 'border-blue-500/40',
    iconClass: 'text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-yellow-900/30',
    borderClass: 'border-yellow-500/40',
    iconClass: 'text-yellow-400',
  },
};

let toastIdCounter = 0;

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const config = typeConfig[toast.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`
        flex items-start gap-3 min-w-[320px] max-w-[420px] px-4 py-3
        rounded-lg border shadow-lg backdrop-blur-md
        ${config.bgClass} ${config.borderClass}
      `}
    >
      <Icon size={20} className={`shrink-0 mt-0.5 ${config.iconClass}`} />
      <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-0.5 rounded text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        aria-label="Dismiss toast"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `toast-${++toastIdCounter}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
