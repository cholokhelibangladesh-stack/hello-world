import { useRouter } from "@tanstack/react-router";
import { reportError } from "@/lib/errors";
import { useEffect } from "react";

interface Props {
  error: unknown;
  reset: () => void;
}

/**
 * Generic per-route error component. Used as TanStack Router's
 * defaultErrorComponent so any route-level crash (loader throw,
 * render error in a route) shows a clean UI rather than a stack trace.
 */
export function RouteErrorFallback({ error, reset }: Props) {
  const router = useRouter();

  useEffect(() => {
    reportError(error, { scope: "route" });
  }, [error]);

  return (
    <div
      role="alert"
      className="min-h-[60vh] flex items-center justify-center px-6"
    >
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">This page couldn't load</h2>
        <p className="text-muted-foreground">
          We hit an unexpected problem loading this page. Please try again.
        </p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default RouteErrorFallback;
