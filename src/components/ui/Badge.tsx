'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'sm',
      dot = false,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default:
        'bg-gray-100/80 dark:bg-white/10 text-gray-700 dark:text-gray-200 border-gray-200/80 dark:border-white/15',
      neutral:
        'bg-gray-100/70 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border-gray-200/70 dark:border-gray-700/60',
      success:
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
      warning:
        'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
      danger:
        'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25',
      info:
        'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
      accent:
        'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    };

    const dotColors = {
      default: 'bg-gray-400',
      neutral: 'bg-gray-400',
      success: 'bg-emerald-500 animate-pulse',
      warning: 'bg-amber-500',
      danger: 'bg-red-500',
      info: 'bg-sky-500',
      accent: 'bg-indigo-500 animate-pulse',
    };

    const sizeStyles = {
      xs: 'text-[10px] px-2 py-0.5 gap-1 rounded-full font-mono',
      sm: 'text-[11px] px-2.5 py-0.5 gap-1.5 rounded-full font-medium',
      md: 'text-xs px-3 py-1 gap-1.5 rounded-full font-medium',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center select-none border backdrop-blur-xs transition-colors',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
            aria-hidden="true"
          />
        )}
        {icon && <span className="shrink-0 flex items-center">{icon}</span>}
        <span>{children}</span>
      </span>
    );
  }
);

Badge.displayName = 'Badge';
