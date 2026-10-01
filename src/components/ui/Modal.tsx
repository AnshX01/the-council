'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showTrafficLights?: boolean;
  ariaLabelledBy?: string;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showTrafficLights = false,
  ariaLabelledBy = 'modal-title',
  className,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Prevent background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 dark:bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-h-[90vh] flex flex-col overflow-hidden',
          'glass-panel-elevated bg-white/90 dark:bg-[#12141e]/90',
          'border border-gray-200/90 dark:border-white/15',
          'shadow-2xl animate-scale-up',
          maxWidthStyles[maxWidth],
          className
        )}
      >
        {/* Modal Window Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-200/60 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            {showTrafficLights && (
              <div className="mac-traffic-lights mr-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="mac-traffic-dot mac-traffic-dot-close"
                  aria-label="Close window"
                />
                <span className="mac-traffic-dot mac-traffic-dot-minimize" />
                <span className="mac-traffic-dot mac-traffic-dot-expand" />
              </div>
            )}
            <div>
              {title && (
                <div id={ariaLabelledBy} className="font-serif font-bold text-base sm:text-lg text-gray-950 dark:text-gray-50 leading-tight">
                  {title}
                </div>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
