import { Outlet, createRootRoute, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";


import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { reportError } from "@/lib/errors";
import appCss from "@/index.css?url";
import logoMark from "@/assets/cholo-kheli-mark.png.asset.json";
import AppFrame from "@/components/app/AppFrame";
import FloatingHeader from "@/components/FloatingHeader";
import SiteFooter from "@/components/SiteFooter";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import BanGuard from "@/components/BanGuard";

const APP_PREFIXES = ["/player", "/scout", "/admin", "/resume", "/messages", "/payments"];
function useInAppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  return !!user && APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Cholo Kheli" },
      { name: "description", content: "Cholo Kheli connects Bangladesh's grassroots talent with verified scouts. Safe, transparent, beautifully simple." },
      { property: "og:title", content: "Cholo Kheli — Bangladesh Sports, Digitised" },
      { property: "og:description", content: "Cholo Kheli connects Bangladesh's grassroots talent with verified scouts. Safe, transparent, beautifully simple." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Cholo Kheli" },
      { name: "theme-color", content: "#F2F4F6", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0A171C", media: "(prefers-color-scheme: dark)" },
    ],
    links: [
      // Open the connection to the backend while the page is still loading, so the first data arrives sooner.
      ...(import.meta.env.VITE_SUPABASE_URL ? [{ rel: "preconnect", href: import.meta.env.VITE_SUPABASE_URL as string, crossOrigin: "anonymous" as const }] : []),
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      // Preload the intro logo mark so the loading screen paints
      // instantly on first paint.
      { rel: "preload", href: logoMark.url, as: "image", type: "image/png" },

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
            <BanGuard />
            <ShellRouter />
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

/**
 * Signed-in app routes get the app frame (nav bar + tab bar). The welcome, sign-in and
 * password-reset screens are full-bleed; informational pages get a simple back bar.
 */
function ShellRouter() {
  const inApp = useInAppShell();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fullBleed = pathname.startsWith("/auth") || pathname.startsWith("/reset-password") || pathname.startsWith("/blocked");
  // Product screens use the liquid-glass palette; the public website keeps its paper look.
  const appSurface = inApp || fullBleed;
  useEffect(() => { document.documentElement.classList.toggle("app-scope", appSurface); }, [appSurface]);
  if (inApp) {
    return (
      <AppFrame>
        <Outlet />
      </AppFrame>
    );
  }
  if (fullBleed) {
    return (
      <main id="main">
        <Outlet />
      </main>
    );
  }
  // The public website: floating header, the page, the footer.
  return (
    <>
      <FloatingHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
      <CookieConsentBanner />
    </>
  );
}


function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "globalThis.__name=globalThis.__name||((fn)=>fn);try{if(/^\\/(player|scout|admin|resume|messages|auth|reset-password|blocked)(\\/|$)/.test(location.pathname))document.documentElement.classList.add('app-scope')}catch(e){}",
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html{background:#F2F4F6;color-scheme:light}html.dark{background:#0A171C;color-scheme:dark}@media (prefers-color-scheme:dark){html:not(.light){background:#0A171C}}html.dark #ck-boot-screen{color:#F5F7F8;background:radial-gradient(60% 45% at 50% 44%,rgba(126,200,255,.22),transparent 70%),radial-gradient(50% 40% at 80% 90%,rgba(95,211,181,.12),transparent 70%),#0A171C}html.dark #ck-boot-screen img{filter:brightness(1.18) drop-shadow(0 0 26px rgba(126,200,255,.5))}html.dark #ck-boot-screen span{color:#9FC3D1}body{margin:0;background:inherit;color:hsl(var(--foreground));overflow-x:hidden}#ck-boot-screen{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:inherit;color:#0E2A33;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}#ck-boot-screen>div{display:grid;place-items:center;gap:18px;text-align:center}#ck-boot-screen img{width:76px;height:76px;object-fit:contain;filter:drop-shadow(0 10px 26px rgba(0,0,0,.42))}#ck-boot-screen strong{display:block;font-size:17px;font-weight:600}#ck-boot-screen span{display:block;font-size:13px;color:#5F6B71}@media (prefers-reduced-motion:no-preference){#ck-boot-screen img{animation:ckBootPulse 1.15s ease-in-out infinite alternate}@keyframes ckBootPulse{from{transform:scale(.96);opacity:.72}to{transform:scale(1);opacity:1}}}",
          }}
        />
        <HeadContent />
      </head>
      <body>
        <BootScreen />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function BootScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(false));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!visible) return null;

  return (
    <div id="ck-boot-screen" aria-label="Opening Cholo Kheli" role="status">
      <div>
        <img src={logoMark.url} alt="" aria-hidden="true" />
        <p>
          <strong>Cholo Kheli</strong>
          <span>Let&apos;s play</span>
        </p>
      </div>
    </div>
  );
}
