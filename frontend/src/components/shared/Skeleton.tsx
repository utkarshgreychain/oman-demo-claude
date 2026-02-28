interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

const variantClasses: Record<string, string> = {
  text: 'rounded-md h-4',
  circular: 'rounded-full',
  rectangular: 'rounded-lg',
  card: 'rounded-xl',
};

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
}
