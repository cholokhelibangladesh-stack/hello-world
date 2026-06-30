import { Component, type ReactNode } from "react";
import { reportError } from "@/lib/errors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level React error boundary. Catches runtime render/lifecycle crashes
 * anywhere below it and shows a clean, generic UI instead of a blank screen
 * or a raw error message. Detailed logs go to the console in dev only.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown): void {
    reportError(error, { info });
  }

  private handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-background px-6"
      >
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-muted-foreground">
            We hit an unexpected problem. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
