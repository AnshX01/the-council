'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-gray-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full px-3.5 py-2.5 rounded-[12px] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'bg-white/70 dark:bg-white/[0.06] backdrop-blur-md',
              'border border-gray-200/90 dark:border-white/15 shadow-xs',
              'transition-all duration-200 outline-none',
              'focus:bg-white dark:focus:bg-white/[0.1] focus:border-indigo-500/80 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 text-gray-400 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            'w-full p-3.5 rounded-[14px] text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'bg-white/70 dark:bg-white/[0.06] backdrop-blur-md resize-none',
            'border border-gray-200/90 dark:border-white/15 shadow-xs',
            'transition-all duration-200 outline-none leading-relaxed',
            'focus:bg-white dark:focus:bg-white/[0.1] focus:border-indigo-500/80 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />

        {error && (
          <p id={`${inputId}-error`} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
