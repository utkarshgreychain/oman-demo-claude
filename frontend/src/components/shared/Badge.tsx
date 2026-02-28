import { type ReactNode } from 'react';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-900/40 text-green-400 border-green-500/30',
  error: 'bg-red-900/40 text-red-400 border-red-500/30',
  warning: 'bg-yellow-900/40 text-yellow-400 border-yellow-500/30',
  info: 'bg-blue-900/40 text-blue-400 border-blue-500/30',
  default: 'bg-surface-light text-text-secondary border-border',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full
        text-xs font-medium border
        ${variantClasses[variant]}
      `}
    >
      {children}
    </span>
  );
}
