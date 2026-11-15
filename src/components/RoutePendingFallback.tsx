import { Loader2 } from "lucide-react";

/**
 * Shown in place of a page while its code or data is still loading. The header and tab bar stay on
 * screen, so switching tabs never blanks the app; the page area just shows a quiet spinner.
 */
export function RoutePendingFallback() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50dvh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default RoutePendingFallback;
