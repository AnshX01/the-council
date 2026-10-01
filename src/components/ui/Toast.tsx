'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type = 'info', title, description, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newItem: ToastItem = { id, type, title, description, duration };

      setToasts((prev) => [...prev.slice(-3), newItem]); // Max 4 toasts to avoid screen clutter

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Reserved toast portal container to prevent layout shift */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-3.5 rounded-[14px]',
              'glass-panel-elevated bg-white/95 dark:bg-[#151724]/95',
              'border border-gray-200/90 dark:border-white/15',
              'shadow-lg animate-slide-up text-xs transition-all duration-200'
            )}
          >
            <div className="shrink-0 pt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-sky-500" />}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">{t.title}</h5>
              {t.description && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                  {t.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-[6px] hover:bg-gray-100 dark:hover:bg-white/10"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if invoked outside ToastProvider
    return {
      toast: () => '',
      dismiss: () => {},
    };
  }
  return context;
}
