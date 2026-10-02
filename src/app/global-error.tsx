"use client";

/**
 * Origin: AnshX01/Atlas (frontend/src/app/global-error.tsx)
 * Top-level React error boundary for unhandled server/client crashes.
 */

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical Council global error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body style={{ margin: 0, backgroundColor: "#000000", color: "#ffffff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh", width: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", textAlign: "center" }}>
          <div style={{ maxWidth: "28rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "700", letterSpacing: "-0.02em", margin: 0 }}>
              Critical Chamber Failure
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#a1a1aa", lineHeight: "1.5", margin: 0 }}>
              The application encountered an irrecoverable state. Click below to reboot the UI shell.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  borderRadius: "0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = "/"; }}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#18181b",
                  color: "#ffffff",
                  borderRadius: "0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Reload Chamber
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
