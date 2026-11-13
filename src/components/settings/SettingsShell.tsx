import { ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

/**
 * Shell for settings detail pages: frosted bar with a back button (router history, so it
 * returns to wherever the user came from), then an iOS large title and optional description.
 */
const SettingsShell = ({ title, description, children, right }: {
  title: string;
  description?: string;
  children: ReactNode;
  right?: ReactNode;
}) => {
  const router = useRouter();
  return (
    <div className="min-h-full pb-10">
      <header className="ios-bar sticky top-0 z-20 border-b border-border/70" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-12 w-full max-w-2xl items-center justify-between px-2">
          <button type="button" onClick={() => router.history.back()} className="press flex items-center gap-0.5 rounded-full px-1 py-2 text-[17px] text-primary">
            <ChevronLeft className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
            Back
          </button>
          {right}
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-4 pt-3">
        <h1 className="large-title">{title}</h1>
        {description ? <p className="mt-1 text-[15px] text-muted-foreground">{description}</p> : null}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
};

export default SettingsShell;
