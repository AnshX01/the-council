/**
 * Origin: AnshX01/Atlas (frontend/src/components/ui/ErrorBoundary.tsx)
 * Graceful error boundary preventing unhandled UI crashes.
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught ErrorBoundary error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[320px] p-8 m-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4 text-[var(--status-urgent)]">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
            {this.state.error?.message || "An unexpected error occurred while rendering the chamber view."}
          </p>
          <Button
            variant="secondary"
            size="md"
            onClick={this.handleRetry}
            leftIcon={<RefreshCw size={14} />}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
