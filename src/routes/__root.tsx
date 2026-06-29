import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

import type { QueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import FloatingHeader from "@/components/FloatingHeader";
import appCss from "@/index.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cholo Kheli — Bangladesh Sports, Digitised" },
      { name: "description", content: "Cholo Kheli connects Bangladesh's grassroots talent with verified scouts. Safe, transparent, beautifully simple." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppShell />
    </RootDocument>
  );
}

function AppShell() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <FloatingHeader />
          <Outlet />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
