import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteErrorFallback } from "@/components/RouteErrorFallback";
import { RoutePendingFallback } from "@/components/RoutePendingFallback";

export const getRouter = () =>
  createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultErrorComponent: RouteErrorFallback,
    // Only show the loading screen when a navigation actually takes a while
    // (>400ms), and once shown keep it up long enough to not flash (>250ms).
    defaultPendingComponent: RoutePendingFallback,
    defaultPendingMs: 400,
    defaultPendingMinMs: 0,
  });

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
