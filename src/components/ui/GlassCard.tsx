'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'highlight';
  interactive?: boolean;
  padded?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  as?: React.ElementType;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = 'default',
      interactive = false,
      padded = 'md',
      as: Component = 'div',
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'glass-panel',
      elevated: 'glass-panel-elevated',
      subtle: 'glass-panel-subtle',
      highlight: 'glass-panel border-indigo-500/30 dark:border-indigo-400/30 council-glow',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-4 sm:p-5',
      lg: 'p-6 sm:p-8',
      xl: 'p-8 sm:p-10',
    };

    return (
      <Component
        ref={ref}
        className={cn(
          variantStyles[variant],
          paddingStyles[padded],
          interactive && 'glass-interactive',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassCard.displayName = 'GlassCard';
