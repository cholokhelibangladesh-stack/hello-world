import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

/** Chrome for signed-out / informational pages (privacy policy, FAQ, safe scouting). */
const PublicShell = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const back = () => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" }));
  return (
    <div className="min-h-[100dvh]">
      <header className="ios-bar sticky top-0 z-30 border-b border-border/70" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-12 max-w-2xl items-center px-2">
          <button type="button" onClick={back} className="press flex items-center gap-0.5 rounded-full px-1 py-2 text-[17px] text-primary">
            <ChevronLeft className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
            Back
          </button>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-2xl" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>
        {children}
      </main>
    </div>
  );
};
export default PublicShell;
