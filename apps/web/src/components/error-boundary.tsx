"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  declare readonly refs: Record<string, never>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            padding: "1rem",
            borderRadius: "0.5rem",
            background: "var(--pf-highlight)",
            border: "1px solid #FECACA",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--pf-error-strong)", marginBottom: "0.5rem" }}>
            Something went wrong loading this section.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "0.375rem",
              background: "var(--pf-error-strong)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
