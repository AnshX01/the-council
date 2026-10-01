'use client';

import React, { useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  debounceMs?: number;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      children,
      onClick,
      debounceMs = 400,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const lastClickRef = useRef<number>(0);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || isLoading) {
          e.preventDefault();
          return;
        }

        const now = Date.now();
        if (debounceMs > 0 && lastClickRef.current > 0 && now - lastClickRef.current < debounceMs) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        lastClickRef.current = now;
        onClick?.(e);
      },
      [disabled, isLoading, debounceMs, onClick]
    );

    const baseStyles =
      'inline-flex items-center justify-center font-medium select-none transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

    const variantStyles = {
      primary:
        'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm hover:shadow-md border border-indigo-500/30',
      secondary:
        'bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 active:bg-gray-100 dark:active:bg-white/20 text-gray-800 dark:text-gray-100 border border-gray-200/80 dark:border-white/15 shadow-xs',
      glass:
        'bg-white/60 dark:bg-white/[0.08] backdrop-blur-md hover:bg-white/80 dark:hover:bg-white/[0.14] active:bg-white/90 dark:active:bg-white/[0.18] text-gray-800 dark:text-gray-100 border border-white/40 dark:border-white/15 shadow-sm',
      ghost:
        'bg-transparent hover:bg-gray-100/70 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
      danger:
        'bg-red-600/90 hover:bg-red-600 text-white shadow-sm border border-red-500/30',
    };

    const sizeStyles = {
      xs: 'text-[11px] px-2.5 py-1 rounded-[8px] gap-1.5 h-7',
      sm: 'text-xs px-3 py-1.5 rounded-[10px] gap-1.5 h-8',
      md: 'text-xs sm:text-sm px-4 py-2 rounded-[12px] gap-2 h-9 sm:h-10',
      lg: 'text-sm sm:text-base px-6 py-2.5 rounded-[14px] gap-2.5 h-11 sm:h-12',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        onClick={handleClick}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
