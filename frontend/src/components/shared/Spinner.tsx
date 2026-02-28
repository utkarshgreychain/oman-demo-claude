type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-3',
};

export function Spinner({ size = 'md', color }: SpinnerProps) {
  return (
    <div
      className={`
        inline-block animate-spin rounded-full
        border-solid border-current border-r-transparent
        ${sizeClasses[size]}
      `}
      style={color ? { color } : { color: 'var(--color-primary)' }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
