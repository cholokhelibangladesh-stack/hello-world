import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";


import type { QueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import FloatingHeader from "@/components/FloatingHeader";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { reportError } from "@/lib/errors";
import appCss from "@/index.css?url";

function RootRouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    reportError(error, { boundary: "root_route" });
  }, [error]);

  return (
    <RootDocument>
      <div role="alert" className="min-h-screen flex items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">This page couldn't load</h1>
          <p className="text-muted-foreground">
            We hit an unexpected problem loading Cholo Kheli. Please try again.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    </RootDocument>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cholo Kheli — Bangladesh Sports, Digitised" },
      { name: "description", content: "Cholo Kheli connects Bangladesh's grassroots talent with verified scouts. Safe, transparent, beautifully simple." },
      { property: "og:title", content: "Cholo Kheli — Bangladesh Sports, Digitised" },
      { property: "og:description", content: "Cholo Kheli connects Bangladesh's grassroots talent with verified scouts. Safe, transparent, beautifully simple." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  errorComponent: RootRouteError,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppErrorBoundary>
        <AppShell />
      </AppErrorBoundary>
    </RootDocument>
  );
}

function AppShell() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <FloatingHeader />
            <Outlet />
            <CookieConsentBanner />
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}


function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ backgroundColor: "#030303" }}>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html{background:#030303;color-scheme:light dark}body{margin:0;background:#030303;color:#f5f7f8;overflow-x:hidden}",
          }}
        />
        <HeadContent />
      </head>
      <body style={{ margin: 0, backgroundColor: "#030303", color: "#f5f7f8", overflowX: "hidden" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
