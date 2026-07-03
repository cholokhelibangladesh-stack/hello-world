import { Loader2 } from "lucide-react";

export function RoutePendingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in pointer-events-none"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/70" />
        <span className="text-xs tracking-[0.3em] uppercase text-foreground/60">
          Loading
        </span>
      </div>
    </div>
  );
}

export default RoutePendingFallback;
