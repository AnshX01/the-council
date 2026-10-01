'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs({ tabs, activeTab, onChange, className, size = 'sm' }: TabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      const nextIdx = (index + 1) % tabs.length;
      onChange(tabs[nextIdx].id);
    } else if (e.key === 'ArrowLeft') {
      const prevIdx = (index - 1 + tabs.length) % tabs.length;
      onChange(tabs[prevIdx].id);
    }
  };

  const sizeClasses = {
    sm: 'p-1 gap-1 text-xs rounded-[10px]',
    md: 'p-1.5 gap-1.5 text-xs sm:text-sm rounded-[12px]',
  };

  const buttonSizeClasses = {
    sm: 'px-2.5 py-1 rounded-[8px]',
    md: 'px-3.5 py-1.5 rounded-[10px]',
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        'inline-flex items-center bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/80 dark:border-white/10 backdrop-blur-md shadow-xs',
        sizeClasses[size],
        className
      )}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'inline-flex items-center gap-1.5 font-medium transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50',
              buttonSizeClasses[size],
              isActive
                ? 'bg-white dark:bg-white/15 text-gray-950 dark:text-white shadow-xs font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-white/5'
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                  isActive
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'bg-gray-200/60 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
