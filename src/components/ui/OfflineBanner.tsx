/**
 * Origin: AnshX01/Atlas (frontend/src/components/ui/OfflineBanner.tsx)
 * Subdued bottom banner alerting user when offline.
 */

"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--status-urgent)] px-4 py-2.5 rounded-xl z-50 flex items-center gap-2 text-xs font-medium animate-spring-slide-up"
    >
      <WifiOff size={14} aria-hidden="true" />
      <span>You are offline. Reconnecting when connection restores...</span>
    </div>
  );
}
