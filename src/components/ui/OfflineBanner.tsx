'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-50 w-full bg-amber-500/90 text-white backdrop-blur-md px-4 py-2 text-xs flex items-center justify-between shadow-md"
    >
      <div className="flex items-center gap-2 max-w-6xl mx-auto w-full">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span className="font-medium">
          Network connection lost. Live deliberation streaming paused until reconnected.
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
}
